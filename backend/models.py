import os
import json
import numpy as np
from sentence_transformers import SentenceTransformer
from llama_cpp import Llama
from transformers import BertTokenizer, BertForMaskedLM
import torch

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

    def reply_sbert(self, text: str):
        user_emb = self.sbert_model.encode([text])[0]
        sims = np.dot(self.corpus_embeddings, user_emb) / (
            np.linalg.norm(self.corpus_embeddings, axis=1) * np.linalg.norm(user_emb)
        )
        return self.corpus[np.argmax(sims)]

    def reply_mistral(self, text: str):
        prompt = f"[INST] You are a helpful assistant. Answer briefly in 1-2 sentences: {text} [/INST]"
        
        resp = self.mistral_model(
            prompt,
            max_tokens=50,
            stop=["[/INST]"]
        )
        
        reply = resp["choices"][0]["text"].strip()
        reply = reply.split(".")[0] + "." if "." in reply else reply
        return reply


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
