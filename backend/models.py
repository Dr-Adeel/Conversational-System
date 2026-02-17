import os
import json
import random
import numpy as np
import re
import time
from sentence_transformers import SentenceTransformer
from llama_cpp import Llama
from transformers import BertTokenizer, BertForMaskedLM
import torch
from db import get_products


def with_delay(fn):
    """Decorator to add a fixed delay after producing a reply."""
    def wrapper(self, *args, **kwargs):
        res = fn(self, *args, **kwargs)
        try:
            time.sleep(2)
        except Exception:
            pass
        return res
    return wrapper


def parse_number(val):
    """Parse numeric values from strings or numbers into float, return None if not parseable."""
    if val is None:
        return None
    if isinstance(val, (int, float)):
        return float(val)
    try:
        s = str(val).strip().replace(',', '.')
        m = re.search(r"(-?\d+(?:\.\d+)?)", s)
        if m:
            return float(m.group(1))
    except Exception:
        return None
    return None

class ModelsInterface:
    def __init__(self):
        
        self.sbert_model = SentenceTransformer("all-MiniLM-L6-v2")
        
        BASE_DIR = os.path.dirname(os.path.abspath(__file__))
        corpus_path = os.path.join(BASE_DIR, "corpus", "corpus.json")
        with open(corpus_path, "r", encoding="utf-8") as f:
            self.corpus = json.load(f)

        
        self.corpus_embeddings = self.sbert_model.encode(self.corpus)

     
        model_path = os.path.join(BASE_DIR, "mistral_model", "mistral-7b-instruct-v0.2.Q4_K_M.gguf")
        print("Loading Mistral model from:", model_path)
        self.mistral_model = Llama(model_path=model_path)

        
        self.bert_tokenizer = BertTokenizer.from_pretrained("bert-base-uncased")
        self.bert_model = BertForMaskedLM.from_pretrained("bert-base-uncased")
        self.bert_model.eval()

    @with_delay
    def reply_sbert(self, text: str):
        user_emb = self.sbert_model.encode([text])[0]
        sims = np.dot(self.corpus_embeddings, user_emb) / (
            np.linalg.norm(self.corpus_embeddings, axis=1) * np.linalg.norm(user_emb)
        )
        return self.corpus[np.argmax(sims)]


    def _safe_mistral_call(self, prompt: str, max_tokens: int = 150, stop: list | None = None):
        """Call the mistral model but guard against exceeding the model context window.
        On ValueError due to context size, retry with a truncated prompt and smaller token budget.
        """
        stop = stop or []
        try:
            return self.mistral_model(prompt, max_tokens=max_tokens, stop=stop)
        except ValueError as e:
            msg = str(e).lower()
            if "exceed" in msg or "context" in msg:
                # estimate model context size if available
                ctx = getattr(self.mistral_model, "n_ctx", None) or getattr(self.mistral_model, "context_size", None) or 512
                # estimate tokens used by prompt (approx 4 chars per token)
                est_prompt_tokens = max(1, int(len(prompt) / 4))
                remaining = max(10, ctx - est_prompt_tokens - 10)
                # truncate prompt to a safer size (keep first N chars)
                safe_chars = max(300, int(len(prompt) * 0.4))
                short_prompt = prompt[:safe_chars]
                try:
                    return self.mistral_model(short_prompt, max_tokens=min(max_tokens, remaining), stop=stop)
                except Exception:
                    # final fallback: minimal prompt
                    tiny = short_prompt[:800]
                    return self.mistral_model(tiny, max_tokens=20, stop=stop)
            raise

    @with_delay
    def reply_mistral(self, text: str):
        # Get products from database
        products = get_products()
        lower_text = text.lower()

        # Add strict helpers for name-only search used by the explicit compare handler.
        def clean_term_str(s: str) -> str:
            s = (s or "").lower()
            s = re.sub(r"[^a-z0-9 ]", " ", s)
            s = re.sub(r"\b(phone|phones|device|devices|model|the|a|an|please|who|is|better|which|do|you|recommend)\b", " ", s)
            s = re.sub(r"\s+", " ", s).strip()
            return s

        def simple_name_search(term, exclude=None):
            """Strict name/desc substring or multi-token search. Reject single-letter tokens and
            DO NOT fall back to any-token matching to avoid overly-permissive results."""
            if not term:
                return None
            term_norm = re.sub(r"[^a-z0-9 ]", "", term).strip()
            if not term_norm:
                return None
            combined_field = lambda p: (p.get('name','').lower() + ' ' + p.get('desc','').lower())

            # direct substring match first
            exact = [p for p in products if term_norm in combined_field(p)]
            if exclude is not None:
                exact = [p for p in exact if not (p.get('name') == exclude.get('name') and (p.get('desc') or '') == (exclude.get('desc') or ''))]
            if exact:
                exact.sort(key=lambda p: (((parse_number(p.get('rating')) or 0) * 100) - (parse_number(p.get('price')) or 0)), reverse=True)
                return exact[0]

            # multi-token (require tokens of length>1)
            toks = [t for t in re.split(r"\W+", term_norm) if t and len(t) > 1]
            if toks:
                alltok = [p for p in products if all(tok in combined_field(p) for tok in toks)]
                if exclude is not None:
                    alltok = [p for p in alltok if not (p.get('name') == exclude.get('name') and (p.get('desc') or '') == (exclude.get('desc') or ''))]
                if alltok:
                    alltok.sort(key=lambda p: (((parse_number(p.get('rating')) or 0) * 100) - (parse_number(p.get('price')) or 0)), reverse=True)
                    return alltok[0]

            # do NOT use any-token fallback (too permissive)
            return None

        def debug_candidates_strict(term, exclude=None):
            term_norm = re.sub(r"[^a-z0-9 ]", "", (term or "")).strip()
            combined_field = lambda p: (p.get('name','').lower() + ' ' + p.get('desc','').lower())
            out = {"term": term, "exact": [], "multi_token": []}
            exact = [p for p in products if term_norm in combined_field(p)]
            if exclude is not None:
                exact = [p for p in exact if not (p.get('name') == exclude.get('name') and (p.get('desc') or '') == (exclude.get('desc') or ''))]
            for p in exact[:6]:
                out['exact'].append({'name': p.get('name'), 'desc': p.get('desc'), 'price': p.get('price'), 'rating': p.get('rating')})
            toks = [t for t in re.split(r"\W+", term_norm) if t and len(t) > 1]
            if toks:
                multi = [p for p in products if all(tok in combined_field(p) for tok in toks)]
                if exclude is not None:
                    multi = [p for p in multi if not (p.get('name') == exclude.get('name') and (p.get('desc') or '') == (exclude.get('desc') or ''))]
                for p in multi[:6]:
                    out['multi_token'].append({'name': p.get('name'), 'desc': p.get('desc'), 'price': p.get('price'), 'rating': p.get('rating')})
            return out

        # Brand + spec search: detect queries like "i want a samsung with good ram" or "i need a laptop with 512GB storage"
        try:
            brands_set = {((p.get('brand') or '').strip().lower()) for p in products if p.get('brand')}
            # find any brand mentioned
            brand_mentioned = None
            for b in brands_set:
                if b and b in lower_text:
                    brand_mentioned = b
                    break

            # detect product type
            product_type = None
            if any(k in lower_text for k in ("phone", "iphone", "galaxy", "pixel", "mobile", "android")):
                product_type = 'phone'
            if any(k in lower_text for k in ("laptop", "notebook", "macbook", "thinkpad", "xps")):
                product_type = 'laptop'

            # detect spec intent
            spec = None
            ram_match = re.search(r"(\d+)\s*gb\s*ram|ram\s*(?:of\s*)?(\d+)\s*gb", lower_text)
            storage_match = re.search(r"(\d+(?:[.,]\d+)?)\s*(tb|gb)\s*(?:storage|ssd|hdd)?", lower_text)
            battery_match = re.search(r"(\d+)\s*mAh", lower_text)
            if 'ram' in lower_text or ram_match:
                spec = 'ram'
                if ram_match:
                    ram_val = int(ram_match.group(1) or ram_match.group(2) or 0)
                else:
                    # qualitative
                    if 'good ram' in lower_text or 'decent ram' in lower_text:
                        ram_val = 8
                    elif 'high ram' in lower_text or 'lots of ram' in lower_text or 'great ram' in lower_text:
                        ram_val = 16
                    else:
                        ram_val = 8
            elif 'storage' in lower_text or storage_match:
                spec = 'storage'
                if storage_match:
                    num = float(storage_match.group(1).replace(',', '.'))
                    unit = storage_match.group(2)
                    if unit == 'tb':
                        stor_val = int(num * 1024)
                    else:
                        stor_val = int(num)
                else:
                    if 'good storage' in lower_text:
                        stor_val = 256
                    else:
                        stor_val = 128
            elif battery_match or 'battery' in lower_text:
                spec = 'battery'
                if battery_match:
                    batt_val = int(battery_match.group(1))
                else:
                    batt_val = 4000

            if spec and (brand_mentioned or product_type):
                # helper to extract numeric spec from product
                def prod_spec_value(p, which):
                    if which == 'ram':
                        r = p.get('ram')
                        if isinstance(r, dict):
                            return parse_number(r.get('size') or r.get('capacity')) or 0
                        return parse_number(r) or 0
                    if which == 'storage':
                        s = p.get('storage')
                        if isinstance(s, dict):
                            try:
                                return int((s.get('primary', {}).get('capacity')) or 0)
                            except Exception:
                                return parse_number(s.get('primary', {}).get('capacity') if isinstance(s.get('primary'), dict) else s.get('primary')) or 0
                        return parse_number(s) or 0
                    if which == 'battery':
                        return parse_number(p.get('battery')) or 0
                    return 0

                # filter by brand and type
                candidates = []
                for p in products:
                    name_desc = (p.get('name','').lower() + ' ' + (p.get('desc') or '').lower())
                    if brand_mentioned and (p.get('brand') or '').strip().lower() != brand_mentioned and brand_mentioned not in name_desc:
                        continue
                    if product_type and product_type not in name_desc:
                        continue
                    # check spec threshold
                    if spec == 'ram':
                        if prod_spec_value(p, 'ram') >= (ram_val or 0):
                            candidates.append(p)
                    elif spec == 'storage':
                        if prod_spec_value(p, 'storage') >= (stor_val or 0):
                            candidates.append(p)
                    elif spec == 'battery':
                        if prod_spec_value(p, 'battery') >= (batt_val or 0):
                            candidates.append(p)

                # relax brand/type if no candidates
                if not candidates:
                    for p in products:
                        if spec == 'ram' and prod_spec_value(p, 'ram') >= (ram_val or 0):
                            candidates.append(p)
                        if spec == 'storage' and prod_spec_value(p, 'storage') >= (stor_val or 0):
                            candidates.append(p)
                        if spec == 'battery' and prod_spec_value(p, 'battery') >= (batt_val or 0):
                            candidates.append(p)

                if candidates:
                    def score_spec(p):
                        base = (parse_number(p.get('rating')) or 0) * 100
                        specv = prod_spec_value(p, spec)
                        return base + (specv * 2) - (parse_number(p.get('price')) or 0)

                    candidates = sorted(candidates, key=score_spec, reverse=True)
                    sel = candidates[:4]
                    # build response
                    title = f"Top {len(sel)} {brand_mentioned.title() if brand_mentioned else ''} {product_type or ''} matching {spec} requirement"
                    lines = [title + ":"]
                    html_lines = [f"<h3>{title}</h3><ul>"]
                    for p in sel:
                        pv = prod_spec_value(p, spec)
                        price_val = parse_number(p.get('price')) or 0
                        lines.append(f"- {p.get('name')} — {p.get('desc') or ''} — {spec.upper()}: {pv} — ${price_val:.2f}")
                        html_lines.append(f"<li><strong>{p.get('name')}</strong> — {p.get('desc') or ''} — <strong>{spec.upper()}: {pv}</strong> — ${price_val:.2f}</li>")
                    html_lines.append("</ul>")
                    return {"text": "\n".join(lines), "html": "\n".join(html_lines), "products": sel}
        except Exception:
            pass

        # If explicit "who is better X or Y" pattern, handle it immediately with strict search
        m_who = re.search(r"who is better\s+(.+?)\s+(?:or|vs|versus)\s+(.+)", lower_text)
        if m_who:
            raw1 = m_who.group(1).strip()
            raw2 = m_who.group(2).strip()
            t1 = clean_term_str(raw1)
            t2 = clean_term_str(raw2)
            p1 = simple_name_search(t1)
            p2 = simple_name_search(t2, exclude=p1)
            dbg = {'t1': debug_candidates_strict(t1, exclude=None), 't2': debug_candidates_strict(t2, exclude=p1 if p1 else None), 'chosen': {'p1': (p1.get('name') if p1 else None), 'p2': (p2.get('name') if p2 else None)}}
            try:
                print("[DEBUG MATCH STRICT]", json.dumps(dbg, indent=2))
            except Exception:
                pass
            if not p1 or not p2:
                missing = raw1 if not p1 else raw2
                return {"text": f"I couldn't find a product matching '{missing}'. Please give the exact name (e.g., 'Samsung S24').", "products": [], "debug": dbg}

            # reuse comparison logic (simple metrics)
            def metrics_for(p):
                # extract numeric and textual specs where available
                ram_val = 0
                try:
                    ram_raw = p.get('ram')
                    if isinstance(ram_raw, dict):
                        ram_val = parse_number(ram_raw.get('size') or ram_raw.get('capacity') or ram_raw.get('ram')) or 0
                    else:
                        ram_val = parse_number(ram_raw) or 0
                except Exception:
                    ram_val = 0

                stor_val = 0
                try:
                    stor_raw = p.get('storage') or {}
                    if isinstance(stor_raw, dict):
                        stor_val = parse_number((stor_raw.get('primary') or {}).get('capacity') or stor_raw.get('capacity') or stor_raw.get('size')) or 0
                    else:
                        stor_val = parse_number(stor_raw) or 0
                except Exception:
                    stor_val = 0

                batt_val = parse_number(p.get('battery')) or 0

                # determine if product is an electronic device (phones, laptops, tablets, cameras)
                combined = ((p.get('name','') or '') + ' ' + (p.get('desc','') or '')).lower()
                is_elec = any(k in combined for k in ("phone","iphone","galaxy","pixel","mobile","android","laptop","notebook","macbook","thinkpad","tablet","camera","dslr","mirrorless","headphone","headphones","ipad"))

                return {
                    'name': p.get('name'),
                    'price': parse_number(p.get('price')) or 0,
                    'rating': parse_number(p.get('rating')) or 0,
                    'ram': ram_val,
                    'storage': stor_val,
                    'battery': batt_val,
                    'color': str(p.get('color') or p.get('colour') or p.get('colour_name') or '').strip(),
                    'screen': str(p.get('screen') or p.get('display') or p.get('screen_type') or '').strip(),
                    'camera': str(p.get('camera') or p.get('camera_specs') or '').strip(),
                    'os': str(p.get('os') or '').strip(),
                    'features': len(p.get('features') or []),
                    'is_electronic': is_elec
                }

            m1 = metrics_for(p1)
            m2 = metrics_for(p2)
            lines = [f"Comparing {m1['name']} vs {m2['name']}:"]
            if m1['price'] != m2['price']:
                better = m1['name'] if m1['price'] < m2['price'] else m2['name']
                lines.append(f"Price: {m1['price']:.2f} vs {m2['price']:.2f} — better: {better} (cheaper)")
            else:
                lines.append(f"Price: equal (${m1['price']:.2f})")
            if m1['rating'] != m2['rating']:
                better = m1['name'] if m1['rating'] > m2['rating'] else m2['name']
                lines.append(f"Rating: {m1['rating']:.1f} vs {m2['rating']:.1f} — better: {better} (reviews)")
            else:
                lines.append(f"Rating: equal ({m1['rating']:.1f})")
            # Only compare RAM/storage when at least one product is an electronic device
            if m1.get('is_electronic') or m2.get('is_electronic'):
                if (m1.get('ram') or 0) or (m2.get('ram') or 0):
                    if m1['ram'] != m2['ram']:
                        lines.append(f"RAM: {int(m1['ram'])}GB vs {int(m2['ram'])}GB")
                    else:
                        lines.append(f"RAM: equal ({int(m1['ram'])}GB)")
                if (m1.get('storage') or 0) or (m2.get('storage') or 0):
                    if m1['storage'] != m2['storage']:
                        lines.append(f"Storage: {int(m1['storage'])}GB vs {int(m2['storage'])}GB")
                    else:
                        lines.append(f"Storage: equal ({int(m1['storage'])}GB)")
            if m1['features'] != m2['features']:
                lines.append(f"Features: {m1['features']} vs {m2['features']}")
            else:
                lines.append(f"Features: similar ({m1['features']})")

            # Non-numeric/spec comparisons (color, battery, screen, camera, os)
            if (m1.get('color') or '') or (m2.get('color') or ''):
                lines.append(f"Color: {m1.get('color') or 'N/A'} vs {m2.get('color') or 'N/A'}")
            if (m1.get('battery') or 0) or (m2.get('battery') or 0):
                if m1.get('battery') != m2.get('battery'):
                    lines.append(f"Battery: {int(m1.get('battery') or 0)} mAh vs {int(m2.get('battery') or 0)} mAh")
                else:
                    lines.append(f"Battery: equal ({int(m1.get('battery') or 0)} mAh)")
            if (m1.get('screen') or '') or (m2.get('screen') or ''):
                lines.append(f"Screen/display: {m1.get('screen') or 'N/A'} vs {m2.get('screen') or 'N/A'}")
            if (m1.get('camera') or '') or (m2.get('camera') or ''):
                lines.append(f"Camera: {m1.get('camera') or 'N/A'} vs {m2.get('camera') or 'N/A'}")
            if (m1.get('os') or '') or (m2.get('os') or ''):
                lines.append(f"OS: {m1.get('os') or 'N/A'} vs {m2.get('os') or 'N/A'}")

            def overall_score(m):
                # base score
                score = (m['rating'] * 100) + (m.get('ram') or 0) * 2 + (m.get('storage') or 0) * 0.5 + (m.get('features') or 0) * 5 - (m.get('price') or 0) * 0.001
                # penalize missing RAM/storage for electronic devices so items without specs don't rank first
                if m.get('is_electronic'):
                    if not m.get('ram'):
                        score -= 200
                    if not m.get('storage'):
                        score -= 100
                return score

            s1 = overall_score(m1)
            s2 = overall_score(m2)
            if s1 > s2:
                rec = m1['name']
                rec_reason = f"Higher combined score ({s1:.1f} vs {s2:.1f})."
            elif s2 > s1:
                rec = m2['name']
                rec_reason = f"Higher combined score ({s2:.1f} vs {s1:.1f})."
            else:
                rec = m1['name']
                rec_reason = "Similar scores; choose based on price or preference."

            lines.append(f"\nRecommendation: I'd pick {rec}. {rec_reason}")
            return {"text": "\n".join(lines), "products": [p1, p2], "debug": dbg}
        
        # Check for compare/price queries like "compare the price of nintendo products"
        compare_match = re.search(r"compare.*price.*(?:of|for)\s+(.+)", text.lower())
        if compare_match:
            term = compare_match.group(1).strip()
            # remove trailing words like 'products' if present
            term = re.sub(r"\bproducts?$", "", term).strip()
            if not term:
                return {"text": "Please specify which products or brand to compare.", "products": []}

            # Find matching products
            matches = [p for p in products if term in (p.get('name','').lower() + ' ' + p.get('desc','').lower())]
            if not matches:
                return {"text": f"I couldn't find any products matching '{term}'.", "products": []}

            prices = [float(p.get('price') or 0) for p in matches if p.get('price') is not None]
            if not prices:
                return {"text": f"Matching products for '{term}' have no price data.", "products": []}

            max_price = max(prices)
            min_price = min(prices)

            # Find product objects for max/min
            max_prod = next((p for p in matches if float(p.get('price') or 0) == max_price), None)
            min_prod = next((p for p in matches if float(p.get('price') or 0) == min_price), None)

            resp_text = (
                f"For '{term}' products ({len(matches)} found): highest = {max_prod.get('name')} (${max_price:.2f}), "
                f"lowest = {min_prod.get('name')} (${min_price:.2f})."
            )

            # Return structured response with product cards
            return {"text": resp_text, "products": [min_prod, max_prod]}

        # Early explicit comparison handler: simple name-based search (no brand/model heuristics)
        vs_match = re.search(r"([a-z0-9][a-z0-9 \-]{0,80}?)\s*(?:vs|vs\.|v|versus|/| or | or\b)\s*([a-z0-9][a-z0-9 \-]{0,80}?)", lower_text)
        if vs_match and any(k in lower_text for k in ("compare", "who is better", "which is better", "vs", "versus")):
            t1 = vs_match.group(1).strip().lower()
            t2 = vs_match.group(2).strip().lower()

            def simple_find(term, exclude=None):
                if not term:
                    return None
                term_norm = re.sub(r"[^a-z0-9 ]", "", term).strip()
                combined_field = lambda p: (p.get('name','').lower() + ' ' + p.get('desc','').lower())

                # direct substring match first
                exact = [p for p in products if term_norm in combined_field(p)]

                # filter out excluded product(s) by name/desc
                if exclude is not None:
                    exact = [p for p in exact if not (p.get('name') == exclude.get('name') and (p.get('desc') or '') == (exclude.get('desc') or ''))]

                # require multi-char token matching for fuzzy fallback to avoid single-letter false positives
                if not exact:
                    toks = [t for t in re.split(r"\W+", term_norm) if t and len(t) > 1]
                    if toks:
                        exact = [p for p in products if all(tok in combined_field(p) for tok in toks)]
                        if exclude is not None:
                            exact = [p for p in exact if not (p.get('name') == exclude.get('name') and (p.get('desc') or '') == (exclude.get('desc') or ''))]

                # final fallback: any token of length>0 (last resort)
                if not exact:
                    toks_any = [t for t in re.split(r"\W+", term_norm) if t]
                    if toks_any:
                        exact = [p for p in products if any(tok in combined_field(p) for tok in toks_any)]
                        if exclude is not None:
                            exact = [p for p in exact if not (p.get('name') == exclude.get('name') and (p.get('desc') or '') == (exclude.get('desc') or ''))]

                if not exact:
                    return None

                # rank by rating desc then lower price
                def score(p):
                    return ((parse_number(p.get('rating')) or 0) * 100) - (parse_number(p.get('price')) or 0)
                exact.sort(key=score, reverse=True)
                return exact[0]

            # helper for debugging: return candidate lists and selected
            def debug_candidates(term, exclude=None):
                term_norm = re.sub(r"[^a-z0-9 ]", "", (term or "")).strip()
                combined_field = lambda p: (p.get('name','').lower() + ' ' + p.get('desc','').lower())
                out = {"term": term, "exact": [], "multi_token": [], "any_token": []}

                exact = [p for p in products if term_norm in combined_field(p)]
                if exclude is not None:
                    exact = [p for p in exact if not (p.get('name') == exclude.get('name') and (p.get('desc') or '') == (exclude.get('desc') or ''))]
                for p in exact[:6]:
                    out['exact'].append({'name': p.get('name'), 'desc': p.get('desc'), 'price': p.get('price'), 'rating': p.get('rating')})

                toks = [t for t in re.split(r"\W+", term_norm) if t and len(t) > 1]
                if toks:
                    multi = [p for p in products if all(tok in combined_field(p) for tok in toks)]
                    if exclude is not None:
                        multi = [p for p in multi if not (p.get('name') == exclude.get('name') and (p.get('desc') or '') == (exclude.get('desc') or ''))]
                    for p in multi[:6]:
                        out['multi_token'].append({'name': p.get('name'), 'desc': p.get('desc'), 'price': p.get('price'), 'rating': p.get('rating')})

                toks_any = [t for t in re.split(r"\W+", term_norm) if t]
                if toks_any:
                    anyl = [p for p in products if any(tok in combined_field(p) for tok in toks_any)]
                    if exclude is not None:
                        anyl = [p for p in anyl if not (p.get('name') == exclude.get('name') and (p.get('desc') or '') == (exclude.get('desc') or ''))]
                    for p in anyl[:6]:
                        out['any_token'].append({'name': p.get('name'), 'desc': p.get('desc'), 'price': p.get('price'), 'rating': p.get('rating')})

                return out

            p1 = simple_find(t1)
            p2 = simple_find(t2, exclude=p1)

            # if p2 still None or equals p1, try a relaxed search allowing next-best that isn't p1
            if p1 and (not p2 or (p2.get('name') == p1.get('name') and (p2.get('desc') or '') == (p1.get('desc') or ''))):
                # try relaxed search for p2 without exclusion but ensure distinct
                toks_relaxed = [t for t in re.split(r"\W+", t2) if t]
                candidates_relaxed = [p for p in products if any(tok in (p.get('name','').lower() + ' ' + p.get('desc','').lower()) for tok in toks_relaxed)]
                candidates_relaxed = [p for p in candidates_relaxed if not (p.get('name') == p1.get('name') and (p.get('desc') or '') == (p1.get('desc') or ''))]
                if candidates_relaxed:
                    candidates_relaxed.sort(key=lambda p: ((parse_number(p.get('rating')) or 0) * 100) - (parse_number(p.get('price')) or 0), reverse=True)
                    p2 = candidates_relaxed[0]

            if not p1 or not p2:
                missing = t1 if not p1 else t2
                dbg = {
                    't1': debug_candidates(t1, exclude=None),
                    't2': debug_candidates(t2, exclude=p1 if p1 else None),
                    'chosen': {'p1': (p1.get('name') if p1 else None), 'p2': (p2.get('name') if p2 else None)}
                }
                try:
                    print("[DEBUG MATCH]", json.dumps(dbg, indent=2))
                except Exception:
                    pass
                return {"text": f"I couldn't find a product matching '{missing}'. Please give the exact name (e.g., 'Samsung S24').", "products": [], "debug": dbg}

            # compute basic metrics and reply (including textual specs)
            def metrics_for(p):
                ram_val = 0
                try:
                    ram_raw = p.get('ram')
                    if isinstance(ram_raw, dict):
                        ram_val = parse_number(ram_raw.get('size') or ram_raw.get('capacity') or ram_raw.get('ram')) or 0
                    else:
                        ram_val = parse_number(ram_raw) or 0
                except Exception:
                    ram_val = 0

                stor_val = 0
                try:
                    stor_raw = p.get('storage') or {}
                    if isinstance(stor_raw, dict):
                        stor_val = parse_number((stor_raw.get('primary') or {}).get('capacity') or stor_raw.get('capacity') or stor_raw.get('size')) or 0
                    else:
                        stor_val = parse_number(stor_raw) or 0
                except Exception:
                    stor_val = 0

                batt_val = parse_number(p.get('battery')) or 0

                combined = ((p.get('name','') or '') + ' ' + (p.get('desc','') or '')).lower()
                is_elec = any(k in combined for k in ("phone","iphone","galaxy","pixel","mobile","android","laptop","notebook","macbook","thinkpad","tablet","camera","dslr","mirrorless","headphone","headphones","ipad"))
                return {
                    'name': p.get('name'),
                    'price': parse_number(p.get('price')) or 0,
                    'rating': parse_number(p.get('rating')) or 0,
                    'ram': ram_val,
                    'storage': stor_val,
                    'battery': batt_val,
                    'color': str(p.get('color') or p.get('colour') or '').strip(),
                    'screen': str(p.get('screen') or p.get('display') or '').strip(),
                    'camera': str(p.get('camera') or '').strip(),
                    'os': str(p.get('os') or '').strip(),
                    'features': len(p.get('features') or []),
                    'is_electronic': is_elec
                }

            m1 = metrics_for(p1)
            m2 = metrics_for(p2)
            lines = [f"Comparing {m1['name']} vs {m2['name']}:"]
            if m1['price'] != m2['price']:
                better = m1['name'] if m1['price'] < m2['price'] else m2['name']
                lines.append(f"Price: {m1['price']:.2f} vs {m2['price']:.2f} — better: {better} (cheaper)")
            else:
                lines.append(f"Price: equal (${m1['price']:.2f})")
            if m1['rating'] != m2['rating']:
                better = m1['name'] if m1['rating'] > m2['rating'] else m2['name']
                lines.append(f"Rating: {m1['rating']:.1f} vs {m2['rating']:.1f} — better: {better} (reviews)")
            else:
                lines.append(f"Rating: equal ({m1['rating']:.1f})")
            if m1.get('is_electronic') or m2.get('is_electronic'):
                if (m1.get('ram') or 0) or (m2.get('ram') or 0):
                    if m1['ram'] != m2['ram']:
                        lines.append(f"RAM: {int(m1['ram'])}GB vs {int(m2['ram'])}GB")
                    else:
                        lines.append(f"RAM: equal ({int(m1['ram'])}GB)")
                if (m1.get('storage') or 0) or (m2.get('storage') or 0):
                    if m1['storage'] != m2['storage']:
                        lines.append(f"Storage: {int(m1['storage'])}GB vs {int(m2['storage'])}GB")
                    else:
                        lines.append(f"Storage: equal ({int(m1['storage'])}GB)")
            if m1['features'] != m2['features']:
                lines.append(f"Features: {m1['features']} vs {m2['features']}")
            else:
                lines.append(f"Features: similar ({m1['features']})")

            # Non-numeric/spec comparisons (color, battery, screen, camera, os)
            if (m1.get('color') or '') or (m2.get('color') or ''):
                lines.append(f"Color: {m1.get('color') or 'N/A'} vs {m2.get('color') or 'N/A'}")
            if (m1.get('battery') or 0) or (m2.get('battery') or 0):
                if m1.get('battery') != m2.get('battery'):
                    lines.append(f"Battery: {int(m1.get('battery') or 0)} mAh vs {int(m2.get('battery') or 0)} mAh")
                else:
                    lines.append(f"Battery: equal ({int(m1.get('battery') or 0)} mAh)")
            if (m1.get('screen') or '') or (m2.get('screen') or ''):
                lines.append(f"Screen/display: {m1.get('screen') or 'N/A'} vs {m2.get('screen') or 'N/A'}")
            if (m1.get('camera') or '') or (m2.get('camera') or ''):
                lines.append(f"Camera: {m1.get('camera') or 'N/A'} vs {m2.get('camera') or 'N/A'}")
            if (m1.get('os') or '') or (m2.get('os') or ''):
                lines.append(f"OS: {m1.get('os') or 'N/A'} vs {m2.get('os') or 'N/A'}")

            def overall_score(m):
                score = (m['rating'] * 100) + (m.get('ram') or 0) * 2 + (m.get('storage') or 0) * 0.5 + (m.get('features') or 0) * 5 - (m.get('price') or 0) * 0.001
                if m.get('is_electronic'):
                    if not m.get('ram'):
                        score -= 200
                    if not m.get('storage'):
                        score -= 100
                return score

            s1 = overall_score(m1)
            s2 = overall_score(m2)
            if s1 > s2:
                rec = m1['name']
                rec_reason = f"Higher combined score ({s1:.1f} vs {s2:.1f})."
            elif s2 > s1:
                rec = m2['name']
                rec_reason = f"Higher combined score ({s2:.1f} vs {s1:.1f})."
            else:
                rec = m1['name']
                rec_reason = "Similar scores; choose based on price or preference."

            lines.append(f"\nRecommendation: I'd pick {rec}. {rec_reason}")
            dbg = {
                't1': debug_candidates(t1, exclude=None),
                't2': debug_candidates(t2, exclude=p1 if p1 else None),
                'chosen': {'p1': p1.get('name'), 'p2': p2.get('name')}
            }
            try:
                print("[DEBUG MATCH]", json.dumps(dbg, indent=2))
            except Exception:
                pass
            return {"text": "\n".join(lines), "products": [p1, p2], "debug": dbg}

        # General product-vs-product comparison, e.g. "who is better samsung s24 or iphone 13" or "compare galaxy s24 vs iphone 13"
        try:
            # First, prefer exact product-name mentions found in the user's text to avoid numeric-token mistakes
            mentioned = []
            for p in products:
                name_desc = ((p.get('name','') or '') + ' ' + (p.get('desc','') or '')).lower()
                norm = re.sub(r"[^a-z0-9 ]", "", name_desc)
                if norm and norm in lower_text:
                    mentioned.append(p)
                    if len(mentioned) >= 2:
                        break

            if len(mentioned) >= 2:
                prod1, prod2 = mentioned[0], mentioned[1]
            else:
                # try to find two product phrases joined by vs/or/and
                two_match = re.search(r"(?:compare|who is better|which is better|which do you recommend|recommend).*?([a-z0-9][a-z0-9 \-]{0,60}?)\s*(?:vs|vs\.|v|versus|or|and|/)\s*([a-z0-9][a-z0-9 \-]{0,60}?)", lower_text)
                if not two_match:
                    two_match = re.search(r"([a-z0-9][a-z0-9 \-]{0,60}?)\s*(?:vs|vs\.|v|versus|or|and|/)\s*([a-z0-9][a-z0-9 \-]{0,60}?)", lower_text)

                prod1 = prod2 = None
                if two_match and any(k in lower_text for k in ("compare", "who is better", "which is better", "better", "vs", "versus")):
                    t1 = two_match.group(1).strip()
                    t2 = two_match.group(2).strip()

                def clean_term(s):
                    s = s.lower()
                    s = re.sub(r"[^a-z0-9 ]", "", s)
                    s = re.sub(r"\b(phone|phones|device|devices|model|the|a|an)\b", "", s).strip()
                    s = re.sub(r"\s+", " ", s)
                    return s

                c1 = clean_term(t1)
                c2 = clean_term(t2)

                # build brand set from products
                brands_set = {((p.get('brand') or '').strip().lower()) for p in products if p.get('brand')}

                def detect_brand_from_term(term):
                    if not term:
                        return None
                    toks = [t for t in re.split(r"\W+", term) if t]
                    # small alias/fuzzy map to catch common variants or typos
                    alias_map = {
                        'iphone': 'apple',
                        'galaxy': 'samsung',
                        'pixel': 'google',
                        'macbook': 'apple',
                        'smasung': 'samsung',
                        'samusng': 'samsung'
                    }

                    # exact or alias matches first
                    for tok in toks:
                        if tok in brands_set:
                            return tok
                        if tok in alias_map:
                            return alias_map[tok]

                    # substring / prefix / simple fuzzy check
                    for b in brands_set:
                        for tok in toks:
                            if not tok:
                                continue
                            if tok in b or b in tok:
                                return b
                            # prefix match of first 3 chars
                            if len(tok) >= 3 and len(b) >= 3 and (tok.startswith(b[:3]) or b.startswith(tok[:3])):
                                return b
                            # simple character-overlap heuristic
                            if len(set(tok) & set(b)) >= 3:
                                return b
                    return None

                b1 = detect_brand_from_term(c1)
                b2 = detect_brand_from_term(c2)

                # If both terms imply same brand, restrict both searches to that brand
                brand_restrict = None
                if b1 and b2 and b1 == b2:
                    brand_restrict = b1

                def find_best(term, brand_hint=None, category_hint=None):
                    if not term:
                        return None

                    # If we have an explicit brand hint, prefer searching only within that brand's products
                    if brand_hint:
                        brand_filtered = [p for p in products if (p.get('brand') or '').strip().lower() == brand_hint]
                        products_to_search = brand_filtered if brand_filtered else products
                    else:
                        products_to_search = products

                    # ✅ DEFINE THIS BEFORE YOU USE IT
                    def score_for_compare(p):
                        r = parse_number(p.get('rating')) or 0
                        price = parse_number(p.get('price')) or 0
                        feats = len(p.get('features') or [])
                        ram = parse_number(p.get('ram').get('size') if isinstance(p.get('ram'), dict) else p.get('ram')) or 0
                        storage = parse_number(
                            (p.get('storage') or {}).get('primary', {}).get('capacity')
                            if isinstance(p.get('storage'), dict) else p.get('storage')
                        ) or 0
                        return (r * 100) + (ram * 2) + (storage * 0.5) + (feats * 5) - (price * 0.001)

                    # exact phrase match (respect brand-filtering if present)
                    exact = [p for p in products_to_search if term in ((p.get('name','').lower() + ' ' + p.get('desc','').lower()))]

                    if not exact:
                        toks = [t for t in re.split(r"\W+", term) if t]
                        candidates = []
                        for p in products_to_search:
                            combined = (p.get('name','').lower() + ' ' + p.get('desc','').lower())
                            if not combined:
                                continue

                            token_count = sum(1 for tok in toks if tok in combined)
                            all_tokens = 1 if all(tok in combined for tok in toks) else 0
                            exact_phrase = 1 if term in combined else 0
                            brand_bonus = 1 if brand_hint and ((p.get('brand') or '').strip().lower() == brand_hint) else 0

                            if token_count == 0 and exact_phrase == 0:
                                continue

                            match_score = (exact_phrase * 200) + (all_tokens * 50) + (token_count * 10) + (brand_bonus * 30)
                            candidates.append((match_score, p))

                        if not candidates:
                            return None

                        # ✅ NOW THIS WON'T CRASH
                        candidates.sort(key=lambda x: (x[0], score_for_compare(x[1])), reverse=True)
                        exact = [c[1] for c in candidates]

                    if not exact:
                        return None

                    return sorted(exact, key=score_for_compare, reverse=True)[0]

                # choose brand hints: prefer explicit detection, else use shared brand_restrict
                hint1 = b1 or brand_restrict
                hint2 = b2 or brand_restrict

                prod1 = prod1 if ('prod1' in locals() and prod1 is not None) else find_best(c1, brand_hint=hint1, category_hint=None)
                prod2 = prod2 if ('prod2' in locals() and prod2 is not None) else find_best(c2, brand_hint=hint2, category_hint=None)

                # After initial lookup, attempt to infer categories and ensure they match
                def product_category(p):
                    if not p:
                        return None
                    for key in ("type", "category", "product_type"):
                        v = (p.get(key) or "")
                        if v:
                            return str(v).strip().lower()
                    combined = ((p.get('name','') or '') + ' ' + (p.get('desc','') or '')).lower()
                    if any(k in combined for k in ("phone","iphone","galaxy","samsung","pixel","mobile","android")):
                        return 'phone'
                    if any(k in combined for k in ("laptop","macbook","notebook","xps","thinkpad")):
                        return 'laptop'
                    if any(k in combined for k in ("nail","polish","makeup","lipstick")):
                        return 'makeup'
                    if any(k in combined for k in ("camera","dslr","mirrorless")):
                        return 'camera'
                    if any(k in combined for k in ("tablet","ipad")):
                        return 'tablet'
                    return None

                cat1 = product_category(prod1)
                cat2 = product_category(prod2)

                # If categories are detected and differ, ask user to clarify — don't compare across categories
                if cat1 and cat2 and cat1 != cat2:
                    return {"text": f"Those are different product categories ({cat1} vs {cat2}). I can't provide a meaningful feature comparison across categories — do you want a price-only comparison or to compare two {cat1} products?", "products": [prod1, prod2]}

                # If one product has a category but the other lookup failed to respect it, retry with category hints
                if cat1 and not cat2:
                    prod2 = find_best(c2, brand_hint=hint2, category_hint=cat1) or prod2
                    cat2 = product_category(prod2)
                if cat2 and not cat1:
                    prod1 = find_best(c1, brand_hint=hint1, category_hint=cat2) or prod1
                    cat1 = product_category(prod1)

                if not prod1 and not prod2:
                    return {"text": f"I couldn't find products matching '{t1}' or '{t2}'. Could you provide exact model names?", "products": []}
                if not prod1:
                    return {"text": f"I couldn't find products matching '{t1}'. Could you check the name?", "products": []}
                if not prod2:
                    return {"text": f"I couldn't find products matching '{t2}'. Could you check the name?", "products": []}

                # compute metrics
                def metrics(p):
                    ram_val = 0
                    try:
                        ram_raw = p.get('ram')
                        if isinstance(ram_raw, dict):
                            ram_val = parse_number(ram_raw.get('size') or ram_raw.get('capacity') or ram_raw.get('ram')) or 0
                        else:
                            ram_val = parse_number(ram_raw) or 0
                    except Exception:
                        ram_val = 0

                    stor_val = 0
                    try:
                        stor_raw = p.get('storage') or {}
                        if isinstance(stor_raw, dict):
                            stor_val = parse_number((stor_raw.get('primary') or {}).get('capacity') or stor_raw.get('capacity') or stor_raw.get('size')) or 0
                        else:
                            stor_val = parse_number(stor_raw) or 0
                    except Exception:
                        stor_val = 0

                    batt_val = parse_number(p.get('battery')) or 0

                    return {
                        'name': p.get('name'),
                        'price': parse_number(p.get('price')) or 0,
                        'rating': parse_number(p.get('rating')) or 0,
                        'ram': ram_val,
                        'storage': stor_val,
                        'battery': batt_val,
                        'color': (p.get('color') or p.get('colour') or '').strip(),
                        'screen': (p.get('screen') or p.get('display') or '').strip(),
                        'camera': str(p.get('camera') or '').strip(),
                        'os': str(p.get('os') or '').strip(),
                        'features': len(p.get('features') or []),
                        'is_electronic': any(k in (((p.get('name','') or '') + ' ' + (p.get('desc','') or '')).lower()) for k in ("phone","iphone","galaxy","pixel","mobile","android","laptop","notebook","macbook","thinkpad","tablet","camera","dslr","mirrorless","headphone","headphones","ipad"))
                    }

                m1 = metrics(prod1)
                m2 = metrics(prod2)

                # per-metric winner
                lines = [f"Comparing {m1['name']} vs {m2['name']}:"]
                # price lower is better
                if m1['price'] != m2['price']:
                    better = m1['name'] if m1['price'] < m2['price'] else m2['name']
                    lines.append(f"Price: {m1['price']:.2f} vs {m2['price']:.2f} — better: {better} (cheaper)")
                else:
                    lines.append(f"Price: equal (${m1['price']:.2f})")

                # rating higher is better
                if m1['rating'] != m2['rating']:
                    better = m1['name'] if m1['rating'] > m2['rating'] else m2['name']
                    lines.append(f"Rating: {m1['rating']:.1f} vs {m2['rating']:.1f} — better: {better} (reviews)")
                else:
                    lines.append(f"Rating: equal ({m1['rating']:.1f})")

                # RAM and storage: only meaningful for electronic products or when data exists
                if m1.get('is_electronic') or m2.get('is_electronic'):
                    if (m1.get('ram') or 0) or (m2.get('ram') or 0):
                        if m1['ram'] != m2['ram']:
                            better = m1['name'] if m1['ram'] > m2['ram'] else m2['name']
                            lines.append(f"RAM: {int(m1['ram'])}GB vs {int(m2['ram'])}GB — better: {better}")
                        else:
                            lines.append(f"RAM: equal ({int(m1['ram'])}GB)")
                    if (m1.get('storage') or 0) or (m2.get('storage') or 0):
                        if m1['storage'] != m2['storage']:
                            better = m1['name'] if m1['storage'] > m2['storage'] else m2['name']
                            lines.append(f"Storage: {int(m1['storage'])}GB vs {int(m2['storage'])}GB — better: {better}")
                        else:
                            lines.append(f"Storage: equal ({int(m1['storage'])}GB)")

                # features
                if m1['features'] != m2['features']:
                    better = m1['name'] if m1['features'] > m2['features'] else m2['name']
                    lines.append(f"Features (count): {m1['features']} vs {m2['features']} — better: {better}")
                else:
                    lines.append(f"Features: similar ({m1['features']})")

                # Non-numeric/spec comparisons (color, battery, screen, camera, os)
                if (m1.get('color') or '') or (m2.get('color') or ''):
                    lines.append(f"Color: {m1.get('color') or 'N/A'} vs {m2.get('color') or 'N/A'}")
                if (m1.get('battery') or 0) or (m2.get('battery') or 0):
                    if m1.get('battery') != m2.get('battery'):
                        lines.append(f"Battery: {int(m1.get('battery') or 0)} mAh vs {int(m2.get('battery') or 0)} mAh")
                    else:
                        lines.append(f"Battery: equal ({int(m1.get('battery') or 0)} mAh)")
                if (m1.get('screen') or '') or (m2.get('screen') or ''):
                    lines.append(f"Screen/display: {m1.get('screen') or 'N/A'} vs {m2.get('screen') or 'N/A'}")
                if (m1.get('camera') or '') or (m2.get('camera') or ''):
                    lines.append(f"Camera: {m1.get('camera') or 'N/A'} vs {m2.get('camera') or 'N/A'}")
                if (m1.get('os') or '') or (m2.get('os') or ''):
                    lines.append(f"OS: {m1.get('os') or 'N/A'} vs {m2.get('os') or 'N/A'}")

                # overall score with penalties for missing specs on electronic products
                def overall_score(m):
                    score = (m.get('rating') * 100) + (m.get('ram') or 0) * 2 + (m.get('storage') or 0) * 0.5 + (m.get('features') or 0) * 5 - (m.get('price') or 0) * 0.001
                    if m.get('is_electronic'):
                        if not m.get('ram'):
                            score -= 200
                        if not m.get('storage'):
                            score -= 100
                    return score

                s1 = overall_score(m1)
                s2 = overall_score(m2)
                if s1 > s2:
                    rec = m1['name']
                    rec_reason = f"Higher combined score ({s1:.1f} vs {s2:.1f}) considering reviews, RAM, storage, and features."
                elif s2 > s1:
                    rec = m2['name']
                    rec_reason = f"Higher combined score ({s2:.1f} vs {s1:.1f}) considering reviews, RAM, storage, and features."
                else:
                    rec = m1['name']
                    rec_reason = "Similar scores; choose based on price or personal preference."

                lines.append(f"\nRecommendation: I'd pick {rec}. {rec_reason}")

                return {"text": "\n".join(lines), "products": [prod1, prod2]}
        except Exception:
            pass
        
        # Format products into a context string
        products_context = "Available products:\n"
        for i, product in enumerate(products[:5], 1):  # Limit to 5 products for context
            products_context += f"{i}. {product['name']}: {product['desc']} - ${product['price']}\n"
        
        # Detect recommendation intent
        rec_intent = any(w in lower_text for w in ("recommend", "suggest", "best", "i need", "looking for", "good"))

        # Quick brand-specific detection: if user explicitly mentions a brand (e.g., "samsung"),
        # return four products for that brand (prefer exact brand field match, then name/desc).
        try:
            brands = {((p.get('brand') or '').strip().lower()): True for p in products if p.get('brand')}
            brand_mentioned = None
            for b in brands.keys():
                if b and b in lower_text:
                    brand_mentioned = b
                    break

            if brand_mentioned:
                # If this looks like an explicit comparison query, skip the brand-only handler
                if re.search(r"\b(vs|versus|compare|who is better|which is better)\b", lower_text):
                    # fall through so comparison logic can handle the request
                    raise Exception("skip brand handler for comparison")
                # try to extract a model token following the brand, e.g. 'samsung s24'
                model_match = re.search(r"" + re.escape(brand_mentioned) + r"\s+([a-z0-9\- ]{1,30})", lower_text)
                model_term = None
                if model_match:
                    model_term = model_match.group(1).strip()
                    # remove generic words
                    model_term = re.sub(r"\b(phone|phones|device|devices|model)\b", "", model_term).strip()

                # If a model term was found, attempt an exact phrase match first (brand + model)
                if model_term:
                    phrase = f"{brand_mentioned} {model_term}".lower()
                    phrase = re.sub(r"[^a-z0-9 ]", "", phrase).strip()
                    phrase = re.sub(r"\s+", " ", phrase)
                    exact_phrase_matches = [p for p in products if phrase in ((p.get('name','').lower() + ' ' + p.get('desc','').lower()))]
                    if exact_phrase_matches:
                        exact_phrase_matches = sorted(exact_phrase_matches, key=score_product_brand, reverse=True)
                        sel = exact_phrase_matches[:4]
                        lines = [f"Exact matches for '{phrase}':"]
                        for p in sel:
                            price_val = parse_number(p.get('price')) or 0
                            lines.append(f"- {p.get('name')} — {p.get('desc') or ''} (${price_val:.2f})")
                        return {"text": "\n".join(lines), "products": sel}

                def score_product_brand(p):
                    r = parse_number(p.get('rating')) or 0
                    price = parse_number(p.get('price')) or 0
                    feats = len(p.get('features') or [])
                    # prefer higher rating, then lower price
                    return (r * 1000) - price + (feats * 5)

                # prefer exact brand field matches first
                candidates = [p for p in products if (p.get('brand') or '').strip().lower() == brand_mentioned]
                # fallback to name/desc contains brand
                if not candidates:
                    candidates = [p for p in products if brand_mentioned in (p.get('name','').lower() + ' ' + p.get('desc','').lower())]

                # if model term was found, boost or filter by it
                if model_term:
                    mtoks = [t for t in re.split(r"\W+", model_term) if t]
                    def matches_model(p):
                        combined = (p.get('name','').lower() + ' ' + p.get('desc','').lower())
                        return all(tok in combined for tok in mtoks)
                    filtered = [p for p in candidates if matches_model(p)]
                    if filtered:
                        candidates = filtered

                if not candidates:
                    # nothing sensible found
                    return {"text": f"I couldn't find products for '{brand_mentioned}'. Could you clarify the model or broaden the query?", "products": []}

                # deterministic ranking
                candidates = sorted(candidates, key=score_product_brand, reverse=True)
                selected = candidates[:4]

                # build reply text
                lines = [f"Top {len(selected)} {brand_mentioned.title()} products:"]
                for p in selected:
                    price_val = parse_number(p.get('price')) or 0
                    lines.append(f"- {p.get('name')} — {p.get('desc') or ''} (${price_val:.2f})")

                return {"text": "\n".join(lines), "products": selected}
        except Exception:
            # brand-detection should never crash overall flow; if it does, continue to other handlers
            pass
        # Quick informal-search detection: handle queries like "im looking for an iphone", "i want a laptop", "show me macbook"
        try:
            search_match = re.search(r"(?:looking for|i(?:'m| am)? looking for|i want|i need|show me)\s+(?:an?|the)?\s*([a-z0-9][a-z0-9 \-]{0,60})", lower_text)
            if search_match:
                term = search_match.group(1).strip()
                term = re.sub(r"[^a-z0-9 \-]", "", term)
                # prefer exact name/desc matches first
                def contains_term(p):
                    combined = (p.get('name','').lower() + ' ' + p.get('desc','').lower())
                    return term in combined

                exact = [p for p in products if contains_term(p)]
                if not exact:
                    # fallback to token matching
                    toks = [t for t in re.split(r"\W+", term) if t]
                    def token_match(p):
                        combined = (p.get('name','').lower() + ' ' + p.get('desc','').lower())
                        return any(tok in combined for tok in toks)
                    exact = [p for p in products if token_match(p)]

                if not exact:
                    return {"text": f"I couldn't find products matching '{term}'. Could you try a different keyword?", "products": []}

                # scoring similar to other handlers
                def score_search(p):
                    r = parse_number(p.get('rating')) or 0
                    price = parse_number(p.get('price')) or 0
                    feats = len(p.get('features') or [])
                    return (r * 3) - (price * 0.001) + (feats * 0.2)

                exact_sorted = sorted(exact, key=score_search, reverse=True)
                selected = exact_sorted[:4]

                lines = [f"Top {len(selected)} results for '{term}':"]
                for p in selected:
                    price_val = parse_number(p.get('price')) or 0
                    lines.append(f"- {p.get('name')} — {p.get('desc') or ''} (${price_val:.2f})")

                return {"text": "\n".join(lines), "products": selected}
        except Exception:
            pass
        # Check for recommendation by budget queries
        # e.g. "recommend me a product, here is my budget: 1000 euro" or "recommend me a nintendo product, here is my budget 15 dollars"
        budget_match = re.search(r"(budget[:]?\s*|budget\s+is\s+|here is my budget[:]?\s*)([0-9]+(?:[.,][0-9]+)?)\s*(€|euro|euros|dollars|usd|eur|\$)?", lower_text)
        # fallback: any standalone numeric amount anywhere (captures cases like "i got only 10$")
        num_any_match = re.search(r"([0-9]+(?:[.,][0-9]+)?)\s*(€|euro|euros|dollars|usd|eur|\$)?", lower_text)
        # Accept either an explicit budget phrase or any standalone numeric amount
        if "recommend" in lower_text and (budget_match or num_any_match):
            # parse budget
            matcher = budget_match if budget_match else num_any_match
            raw_num = matcher.group(2).replace(',', '.') if budget_match else matcher.group(1).replace(',', '.')
            try:
                budget = float(raw_num)
            except Exception:
                return {"text": "Couldn't parse the budget amount. Please provide a numeric value.", "products": []}

            # remove the budget phrase from the text to avoid contaminating term extraction
            lower_no_budget = re.sub(r"(budget[:]?\s*|budget\s+is\s+|here is my budget[:]?\s*)([0-9]+(?:[.,][0-9]+)?)\s*(€|euro|euros|dollars|usd|eur|\$)?", "", lower_text)

            # attempt to find term/brand before the word 'product' in the cleaned text
            term_match = re.search(r"recommend(?: me)?(?: a| an)?\s*(.+?)\s*(?:product|products)?", lower_no_budget)
            term = None
            if term_match:
                term = term_match.group(1).strip()
                term = re.sub(r"\bproducts?$", "", term).strip()
                # sanitize term: remove stray punctuation and very short tokens
                term = re.sub(r"[^a-z0-9 ]", "", term)
                if term == "" or len(term) <= 1:
                    term = None

            # find matching products under or equal to budget
            def matches_term(p):
                if not term:
                    return True
                combined = (p.get('name','').lower() + ' ' + p.get('desc','').lower())
                if term in combined:
                    return True
                # fallback: any token of term appears in product
                tokens = [t for t in re.split(r"\W+", term) if t]
                return any(tok in combined for tok in tokens)

            matched = [p for p in products if p.get('price') is not None and float(p.get('price') or 0) <= budget and matches_term(p)]

            # New: structured recommendation response when user asks for recommendations without explicit budget or with term
            if rec_intent:
                # extract term (brand or product type)
                term_match = re.search(r"recommend(?: me)?(?: a| an)?\s*(.+?)\s*(?:product|products|under|for|with|that)?", lower_text)
                term = None
                if term_match:
                    term = term_match.group(1).strip()
                    term = re.sub(r"\b(products?|under|for|with|that)\b", "", term).strip()
                    term = re.sub(r"[^a-z0-9 ]", "", term)
                    if term == "" or len(term) <= 1:
                        term = None

                # If the user didn't provide any useful term, try to fallback to simple nouns
                if not term:
                    # look for common categories
                    for cat in ("phone", "laptop", "headphone", "headphones", "makeup", "foundation", "camera", "tablet", "chromebook", "gaming laptop"):
                        if cat in lower_text:
                            term = cat
                            break

                # If still no term and no budget, ask clarifying question
                if not term and not budget_match and not num_any_match:
                    return {"text": "Could you tell me what type of product you're looking for (e.g., phones, laptops, headphones) and your budget or intended use?", "products": []}

                # parse budget if present
                budget = None
                if budget_match:
                    raw_num = budget_match.group(2).replace(',', '.')
                    try:
                        budget = float(raw_num)
                    except Exception:
                        budget = None
                elif num_any_match:
                    try:
                        budget = float(num_any_match.group(1).replace(',', '.'))
                    except Exception:
                        budget = None

                # use global parse_number helper

                # scoring function: prefer higher rating, then lower price, then more features
                def score_product(p):
                    r = parse_number(p.get('rating')) or 0
                    price = parse_number(p.get('price')) or 0
                    feats = len(p.get('features') or [])
                    ram = parse_number(p.get('ram').get('size') if isinstance(p.get('ram'), dict) else p.get('ram')) or 0
                    storage = parse_number((p.get('storage') or {}).get('primary', {}).get('capacity') if isinstance(p.get('storage'), dict) else p.get('storage')) or 0
                    # higher score is better
                    return (r * 3) + (feats * 0.5) + (ram * 0.1) + (storage * 0.02) - (price * 0.001)

                # find candidates matching term (if term provided) else use all products
                candidates = [p for p in products if matches_term(p) and p.get('price') is not None]
                if not candidates:
                    # if no priced candidates, relax price requirement
                    candidates = [p for p in products if matches_term(p)]

                # If budget provided, filter
                if budget is not None:
                    candidates = [p for p in candidates if (parse_number(p.get('price')) or 0) <= budget]

                if not candidates:
                    return {"text": f"I couldn't find products matching '{term or 'your request'}'. Could you specify a different keyword or a budget?", "products": []}

                # sort by score and pick top 8, then select 4 to show diversity (mix by price)
                candidates.sort(key=score_product, reverse=True)
                top = candidates[:8]
                # choose 4 spread across top (best, good value, mid, budget)
                selected = []
                if top:
                    selected.append(top[0])
                if len(top) > 2:
                    selected.append(top[min(2, len(top)-1)])
                if len(top) > 4:
                    selected.append(top[min(4, len(top)-1)])
                # fill up to 4
                idx = 1
                while len(selected) < 4 and idx < len(top):
                    if top[idx] not in selected:
                        selected.append(top[idx])
                    idx += 1

                # build textual structured response
                short_list_lines = []
                for p in selected:
                    brief = p.get('desc') or p.get('name') or ''
                    try:
                        price_val = float(p.get('price') or 0)
                    except Exception:
                        price_val = 0.0
                    short_list_lines.append(f"- {p.get('name')} — {brief} (${price_val:.2f})")

                # comparison: compute key metrics
                def summarize(p):
                    return {
                        'price': parse_number(p.get('price')) or 0,
                        'rating': parse_number(p.get('rating')) or 0,
                        'ram': parse_number(p.get('ram').get('size') if isinstance(p.get('ram'), dict) else p.get('ram')) or 0,
                        'storage': parse_number((p.get('storage') or {}).get('primary', {}).get('capacity') if isinstance(p.get('storage'), dict) else p.get('storage')) or 0,
                        'features': len(p.get('features') or [])
                    }

                summaries = {p.get('name'): summarize(p) for p in selected}

                # comparison paragraph
                comp_lines = []
                avg_price = sum(v['price'] for v in summaries.values())/max(1,len(summaries))
                for p in selected:
                    s = summaries[p.get('name')]
                    strengths = []
                    weaknesses = []
                    if s['rating'] >= 4:
                        strengths.append('strong reviews')
                    if s['ram'] >= 16:
                        strengths.append(f"good RAM ({int(s['ram'])} GB)")
                    if s['storage'] >= 512:
                        strengths.append(f"large storage ({int(s['storage'])} GB)")
                    if s['features'] >= 2:
                        strengths.append('feature-rich')
                    if s['price'] and s['price'] > avg_price:
                        weaknesses.append('relatively expensive')
                    if s['rating'] < 3:
                        weaknesses.append('lower reviews')
                    comp_lines.append(f"{p.get('name')}: strengths: {', '.join(strengths) or 'balanced'}, weaknesses: {', '.join(weaknesses) or 'few'}.")

                # best overall = highest score
                best_overall = max(selected, key=score_product)
                # best budget = lowest price
                best_budget = min(selected, key=lambda x: (parse_number(x.get('price')) or 1e9))
                # best premium = highest price
                best_premium = max(selected, key=lambda x: (parse_number(x.get('price')) or 0))

                text_parts = []
                text_parts.append("Shortlist of 4 recommended products:")
                text_parts.extend(short_list_lines)
                text_parts.append("\nComparison:")
                text_parts.extend(comp_lines)
                text_parts.append(f"\nBest overall: {best_overall.get('name')} — based on a combination of reviews, performance indicators, and value.")
                if best_budget and best_budget != best_overall:
                    text_parts.append(f"Best budget pick: {best_budget.get('name')} — great value for its price.")
                if best_premium and best_premium != best_overall:
                    text_parts.append(f"Best premium pick: {best_premium.get('name')} — highest-end features and performance.")

                return {"text": "\n".join(text_parts), "products": selected}


            if not matched:
                if term:
                    return {"text": f"I couldn't find any {term} products within your budget of {budget:.2f}.", "products": []}
                return {"text": f"I couldn't find any products within your budget of {budget:.2f}.", "products": []}

            # randomize selection within budget for variety, then take up to 4
            random.shuffle(matched)
            selected = matched[:4]

            resp_text = f"Here are {len(selected)} products within your budget of {budget:.2f}:"
            return {"text": resp_text, "products": selected}

        # Handle general recommendations (without budget) - if user specifies a term, respect it
        if "recommend" in lower_text and not budget_match:
            term_match = re.search(r"recommend(?: me)?(?: a| an)?\s*(.+?)\s*(?:product|products)?", lower_text)
            term = None
            if term_match:
                term = term_match.group(1).strip()
                term = re.sub(r"\bproducts?$", "", term).strip()
                # sanitize term
                term = re.sub(r"[^a-z0-9 ]", "", term)
                if term == "" or len(term) <= 1:
                    term = None

            if term:
                matches = [p for p in products if term in (p.get('name','').lower() + ' ' + p.get('desc','').lower())]
            else:
                matches = products[:]

            if not matches:
                return {"text": f"I couldn't find any products matching '{term}'.", "products": []}

            # pick up to 4 recommendations (randomize order for variability)
            random.shuffle(matches)
            recs = matches[:4]
            resp_text = f"Here are {len(recs)} recommended product(s)" + (f" for '{term}'" if term else "") + "."
            return {"text": resp_text, "products": recs}

        # Check if user is asking about products
        keywords = ["product", "recommend", "suggestion", "buy", "price", "shop", "what should i", "what do you recommend"]
        is_product_related = any(keyword in text.lower() for keyword in keywords)
        
        if is_product_related:
            prompt = f"[INST] You are a helpful shopping assistant. Based on the available products, answer the user's question briefly in 1-2 sentences.\n\n{products_context}\nUser: {text} [/INST]"
        else:
            prompt = f"[INST] You are a helpful assistant. Answer briefly in 1-2 sentences: {text} [/INST]"
        
        resp = self._safe_mistral_call(prompt, max_tokens=100, stop=["[/INST]"])
        
        reply = resp["choices"][0]["text"].strip()
        reply = reply.split(".")[0] + "." if "." in reply else reply
        return reply


    @with_delay
    def reply_bert(self, text: str):
        if "[MASK]" not in text:
            text = text + " [MASK]."

        inputs = self.bert_tokenizer(text, return_tensors="pt")
        
        with torch.no_grad():
            outputs = self.bert_model(**inputs)

        logits = outputs.logits
        mask_token_index = (inputs.input_ids == self.bert_tokenizer.mask_token_id)[0].nonzero(as_tuple=True)[0]

        predicted_token_id = logits[0, mask_token_index].argmax(axis=-1)
        predicted_word = self.bert_tokenizer.decode(predicted_token_id)

        return text.replace("[MASK]", predicted_word)

    @with_delay
    def generate_greeting(self, username: str, last_search: str = None):
        """Generate personalized greeting with product recommendations based on search history"""
        products = get_products()
        
        if not last_search:
            # Simple greeting without search history
            return {"greeting": f"Hi {username}, how can I help you today!", "products": []}
        
        # Find products related to the search term
        search_lower = last_search.lower()
        related_products = [
            p for p in products 
            if search_lower in p['name'].lower() or search_lower in p['desc'].lower()
        ][:4]  # Limit to top 4 products
        
        if not related_products:
            return {"greeting": f"Hi {username}, I've seen you've been searching for '{last_search}'. How can I help you today!", "products": []}
        
        # Format product recommendations for AI prompt with bold prices
        product_list = ", ".join([f"{p['name']} (<b>${p['price']}</b>)" for p in related_products])
        
        # Generate greeting with recommendations using Mistral
        prompt = f"[INST] You are a helpful shopping assistant. Generate a friendly greeting IN ENGLISH ONLY for {username} mentioning they searched for '{last_search}' and that you recommend these products: {product_list}. Keep it to 2-3 sentences. Always respond in English regardless of the search term language. [/INST]"
        
        try:
            resp = self._safe_mistral_call(prompt, max_tokens=150, stop=["[/INST]"])
            greeting = resp["choices"][0]["text"].strip()
            
            # Post-process to ensure prices are bold in the greeting text
            import re
            greeting = re.sub(r'\$(\d+\.?\d*)', r'<b>$\1</b>', greeting)
        except Exception:
            # Fallback greeting if AI fails
            greeting = f"Hi {username}! I've seen you've been searching for '{last_search}', so I recommend these products:"
        
        return {"greeting": greeting, "products": related_products}

