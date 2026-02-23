"use client";

import { useState, ChangeEvent, KeyboardEvent, useEffect, useRef, JSX } from "react";
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
//register
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);
import slider1 from "@/assets/slider1.jpg";
import slider2 from "@/assets/slider2.png";
import slider3 from "@/assets/slider3.png";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

interface Message {
  sender: "user" | "bot";
  text: string;
  model?: string;
  id?: string;
  products?: Array<{
    _id: string;
    name: string;
    desc: string;
    price: number;
    rating?: number;
    // optional image/url fields that may be present when products come from different sources
    image?: string;
    img?: string;
    thumbnail?: string;
    thumb?: string;
    image_url?: string;
    picture?: string;
    url?: string;
  }>;
}

// Open product URL; fallback to ebay.fr when missing.
// If `sameTab` is true, navigate in the same tab, otherwise open a new tab.
function openProductUrl(product: any, sameTab = false) {
  try {
    const raw = product?.url || "";
    let url = raw && raw.toString().trim() ? raw.toString().trim() : "https://ebay.fr";
    // ensure scheme
    if (!/^([a-z]+:)?\/\//i.test(url)) {
      url = `https://${url}`;
    }
    if (sameTab) {
      window.location.href = url;
    } else {
      window.open(url, "_blank");
    }
  } catch (err) {
    if (sameTab) {
      window.location.href = "https://ebay.fr";
    } else {
      window.open("https://ebay.fr", "_blank");
    }
  }
}

export default function Page() {
  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  // slider height (px) — change this value to adjust the slider size
  const sliderHeight = 500;
  const [currentPage, setCurrentPage] = useState(1);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showSearchHistory, setShowSearchHistory] = useState(false);
  const [showPageMenu, setShowPageMenu] = useState(false);
  const { isLoggedIn, username, email, logout } = useAuth();
  const router = useRouter();

  

  // Slider images (use assets)
  const sliderImages = [
    { src: slider1, title: "Summer Collection", desc: "Get up to 50% off" },
    { src: slider2, title: "Tech Gadgets", desc: "Latest innovations" },
    { src: slider3, title: "Flash Sale", desc: "Limited time offers" },
  ];

  // Auto-scroll slider
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % sliderImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Load search history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem("searchHistory");
    if (savedHistory) {
      setSearchHistory(JSON.parse(savedHistory));
    }
  }, []);

  // Fetch products from MongoDB
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch("http://localhost:8000/products");
        const data = await res.json();
        setProducts(data.products || []);
      } catch (err) {
        console.error("Failed to fetch products:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Save search to history
  const saveSearchToHistory = (searchTerm: string) => {
    if (!searchTerm.trim()) return;
    
    const updatedHistory = [searchTerm, ...searchHistory.filter(s => s !== searchTerm)];
    setSearchHistory(updatedHistory);
    localStorage.setItem("searchHistory", JSON.stringify(updatedHistory));
  };

  // Handle search submit
  const handleSearchSubmit = () => {
    if (search.trim()) {
      saveSearchToHistory(search);
      setActiveSearch(search);
      setShowSearchHistory(false);
    } else {
      setActiveSearch("");
    }
  };

  // Filter products based on active search
  const filteredProducts = products.filter(product => {
    if (!activeSearch.trim()) return true;
    const searchLower = activeSearch.toLowerCase();
    return (
      product.name?.toLowerCase().includes(searchLower) ||
      product.desc?.toLowerCase().includes(searchLower)
    );
  });

  // Pagination logic
  const itemsPerPage = 16;
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeSearch]);

  // Scroll to top when page changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentPage]);

  useEffect(() => {
    if (!isLoggedIn) {
      router.push("/login");
    }
  }, [isLoggedIn, router]);

  if (!isLoggedIn) {
    return null;
  }

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <>
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes hover-lift { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }

        /* Overlay fade and modal pop animations for smooth appearance */
        @keyframes overlayFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalPop { from { opacity: 0; transform: translateY(8px) scale(0.995); } to { opacity: 1; transform: translateY(0) scale(1); } }

        .product-card:hover { transform: translateY(-8px); }
        .modal-overlay { animation: overlayFade 180ms ease forwards; }
        .modal-pop { animation: modalPop 220ms cubic-bezier(.2,.8,.2,1) forwards; }
      `}</style>

      {/* ===== MODERN HEADER ===== */}
      <header
        style={{
          width: "100%",
          padding: "16px 40px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          boxShadow: "0 10px 30px rgba(102, 126, 234, 0.2)",
          position: "sticky",
          top: 0,
          zIndex: 10,
          animation: "slideDown 0.4s ease-out",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              fontSize: "32px",
              fontWeight: "700",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <span>🛍️</span> EiLShop
          </div>
        </div>

        {/* Search bar */}
        <div style={{ flex: 1, maxWidth: "450px", marginLeft: "40px", position: "relative" }}>
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <div style={{ position: "relative", flex: 1 }}>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => setShowSearchHistory(true)}
                onBlur={() => setTimeout(() => setShowSearchHistory(false), 200)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSearchSubmit();
                  }
                }}
                placeholder="Search products..."
                style={{
                  width: "100%",
                  padding: "12px 16px 12px 40px",
                  border: "none",
                  borderRadius: "24px",
                  outline: "none",
                  fontSize: "14px",
                  backgroundColor: "rgba(255, 255, 255, 0.95)",
                  color: "#000",
                  caretColor: "#000",
                  boxShadow: "0 4px 15px rgba(0, 0, 0, 0.1)",
                  transition: "all 0.3s ease",
                }}
              />
              <span
                style={{
                  position: "absolute",
                  left: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: "18px",
                  color: "#999",
                }}
              >
                🔍
              </span>
            </div>
            <button
              onClick={handleSearchSubmit}
              style={{
                padding: "12px 20px",
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                color: "#667eea",
                border: "none",
                borderRadius: "24px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "600",
                boxShadow: "0 4px 15px rgba(0, 0, 0, 0.1)",
                transition: "all 0.3s ease",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#fff";
                e.currentTarget.style.boxShadow = "0 6px 25px rgba(0, 0, 0, 0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.95)";
                e.currentTarget.style.boxShadow = "0 4px 15px rgba(0, 0, 0, 0.1)";
              }}
            >
              Search
            </button>
          </div>
          
          {/* Search History Dropdown */}
          {showSearchHistory && searchHistory.length > 0 && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                left: 0,
                right: 0,
                backgroundColor: "#fff",
                borderRadius: "12px",
                boxShadow: "0 8px 25px rgba(0, 0, 0, 0.15)",
                zIndex: 1000,
                maxHeight: "200px",
                overflowY: "auto",
              }}
            >
              {searchHistory.slice(0, 4).map((term, index) => (
                <div
                  key={index}
                  onClick={() => {
                    setSearch(term);
                    setActiveSearch(term);
                    setShowSearchHistory(false);
                  }}
                  style={{
                    padding: "12px 16px",
                    cursor: "pointer",
                    borderBottom: index < Math.min(3, searchHistory.length - 1) ? "1px solid #f0f0f0" : "none",
                    transition: "background-color 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#f9fafb";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#fff";
                  }}
                >
                  <span style={{ marginRight: "8px", color: "#999" }}>🕐</span>
                  <span style={{ fontSize: "14px", color: "#333" }}>{term}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User section */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
            marginLeft: "40px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: "#fff",
              fontSize: "14px",
            }}
          >
            <span style={{ fontSize: "20px" }}>👤</span>
            <span style={{ fontWeight: "500" }}>{username}</span>
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: "10px 20px",
              backgroundColor: "rgba(255, 255, 255, 0.2)",
              color: "#fff",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
              transition: "all 0.3s ease",
              backdropFilter: "blur(10px)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.2)";
            }}
          >
            🚪 Logout
          </button>
        </div>
      </header>

      {/* ===== IMAGE SLIDER ===== */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: `${sliderHeight}px`,
          overflow: "hidden",
          backgroundColor: "#f0f0f0",
        }}
      >
        {/* Slider Container */}
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: `linear-gradient(135deg, ${
              currentSlide === 0 ? "#667eea" : currentSlide === 1 ? "#764ba2" : "#f093fb"
            } 0%, ${
              currentSlide === 0 ? "#764ba2" : currentSlide === 1 ? "#f093fb" : "#4facfe"
            } 100%)`,
            transition: "background 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
          }}
        >
          {/* Slide Content (single image) */}
          <div style={{ position: "relative", width: "100%", height: "100%" }}>
            <Image
              src={sliderImages[currentSlide].src}
              alt={sliderImages[currentSlide].title}
              fill
              style={{ objectFit: "fill", objectPosition: "center" }}
            />
          </div>
        </div>

        {/* Previous Button */}
        <button
          onClick={() =>
            setCurrentSlide((prev) =>
              prev === 0 ? sliderImages.length - 1 : prev - 1
            )
          }
          style={{
            position: "absolute",
            left: "20px",
            top: "50%",
            transform: "translateY(-50%)",
            backgroundColor: "rgba(255, 255, 255, 0.3)",
            color: "#fff",
            border: "none",
            borderRadius: "50%",
            width: "50px",
            height: "50px",
            fontSize: "24px",
            cursor: "pointer",
            zIndex: 10,
            transition: "all 0.3s ease",
            backdropFilter: "blur(10px)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.5)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.3)";
          }}
        >
          ❮
        </button>

        {/* Next Button */}
        <button
          onClick={() =>
            setCurrentSlide((prev) => (prev + 1) % sliderImages.length)
          }
          style={{
            position: "absolute",
            right: "20px",
            top: "50%",
            transform: "translateY(-50%)",
            backgroundColor: "rgba(255, 255, 255, 0.3)",
            color: "#fff",
            border: "none",
            borderRadius: "50%",
            width: "50px",
            height: "50px",
            fontSize: "24px",
            cursor: "pointer",
            zIndex: 10,
            transition: "all 0.3s ease",
            backdropFilter: "blur(10px)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.5)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.3)";
          }}
        >
          ❯
        </button>

        {/* Indicator Dots */}
        <div
          style={{
            position: "absolute",
            bottom: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: "10px",
            zIndex: 10,
          }}
        >
          {sliderImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              style={{
                width: currentSlide === index ? "30px" : "12px",
                height: "12px",
                borderRadius: "6px",
                backgroundColor:
                  currentSlide === index
                    ? "rgba(255, 255, 255, 0.9)"
                    : "rgba(255, 255, 255, 0.4)",
                border: "none",
                cursor: "pointer",
                transition: "all 0.3s ease",
              }}
            />
          ))}
        </div>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <main style={{ padding: "50px 40px", backgroundColor: "#f9fafb" }}>
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "40px",
            }}
          >
            <h2
              style={{
                fontSize: "32px",
                fontWeight: "700",
                margin: "0",
                color: "#1a1a2e",
              }}
            >
              Featured Products
            </h2>
            {/* no icon */}
          </div>

          {/* PRODUCT GRID */}
          {/* Show price chart button for current search results */}
          {activeSearch.trim() && filteredProducts.length > 0 && (
            <div style={{ margin: '12px 0 20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  // open a modal using existing chart modal state by pushing the filtered list
                  setProducts((p) => p); // no-op to keep lint happy
                  // set the chart modal products to the full filtered list (not just paginated)
                  // find the Chat component's setter via dispatching a synthetic event: instead we rely on the message-level button normally opening charts.
                  // To keep things simple, open a dedicated modal here by dispatching a custom event the Chat listens for.
                  const ev = new CustomEvent('openPriceChartFor', { detail: { products: filteredProducts } });
                  window.dispatchEvent(ev as any);
                }}
                style={{
                  padding: "10px 16px",
                  background: "#FFD54F",
                  color: "#111",
                  border: "none",
                  borderRadius: 10,
                  cursor: "pointer",
                  fontWeight: 700,
                  boxShadow: "0 8px 22px rgba(0,0,0,0.08)",
                }}
              >
                Show prices chart ({filteredProducts.length})
              </button>
            </div>
          )}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "28px",
              animation: "slideUp 0.6s ease-out 0.2s both",
            }}
          >
            {loading ? (
              <div style={{ gridColumn: "1 / -1", textAlign: "center", color: "#999" }}>
                Loading products...
              </div>
            ) : products.length === 0 ? (
              <div style={{ gridColumn: "1 / -1", textAlign: "center", color: "#999" }}>
                No products found
              </div>
            ) : filteredProducts.length === 0 ? (
              <div style={{ gridColumn: "1 / -1", textAlign: "center", color: "#999" }}>
                No products match your search
              </div>
            ) : (
              paginatedProducts.map((product, i) => (
                <div
                  key={product._id}
                  className="product-card"
                  onClick={() => setSelectedProduct(product)}
                  style={{
                    backgroundColor: "#fff",
                    borderRadius: "16px",
                    overflow: "hidden",
                    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
                    transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                    cursor: "pointer",
                    border: "1px solid rgba(0, 0, 0, 0.05)",
                    height: "340px",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {/* Image placeholder */}
                  <div
                    style={{
                      width: "100%",
                      height: "200px",
                      background: `linear-gradient(135deg, #667eea${
                        i % 2 === 0 ? "" : "40"
                      } 0%, #764ba2${i % 2 === 0 ? "" : "40"} 100%)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "60px",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "80px",
                        opacity: 0.8,
                      }}
                    >
                      {["📱", "⌚", "💻", "🎧", "📷", "🎮"][i % 6]}
                    </div>
                  </div>

                  {/* Content */}
                  <div
                    style={{
                      padding: "20px",
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: "14px",
                          fontWeight: "600",
                          color: "#333",
                          marginBottom: "8px",
                        }}
                      >
                        {product.name}
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#666",
                          lineHeight: "1.4",
                          maxHeight: "40px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {product.desc}
                      </div>
                    </div>

                    {/* Footer */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                        marginTop: "16px",
                      }}
                    >
                      {/* Stars */}
                      <div
                        style={{
                          display: "flex",
                          gap: "2px",
                        }}
                      >
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span
                            key={star}
                            style={{
                              fontSize: "16px",
                              color: star <= (product.rating || 0) ? "#FFB800" : "#ddd",
                            }}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                      {/* Price and Button */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "16px",
                            fontWeight: "700",
                            color: "#667eea",
                          }}
                        >
                          ${(product.price || 0).toFixed(2)}
                        </div>
                        <button
                          style={{
                            padding: "8px 16px",
                            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                            color: "#fff",
                            border: "none",
                            borderRadius: "8px",
                            cursor: "pointer",
                            fontSize: "13px",
                            fontWeight: "600",
                            transition: "all 0.3s ease",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "scale(1.05)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "scale(1)";
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProduct(product);
                          }}
                        >
                          Add to Cart
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* PAGINATION */}
          {filteredProducts.length > itemsPerPage && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "8px",
                marginTop: "40px",
                animation: "slideUp 0.6s ease-out both",
              }}
            >
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                style={{
                  padding: "10px 16px",
                  background: currentPage === 1 ? "#ccc" : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  cursor: currentPage === 1 ? "not-allowed" : "pointer",
                  fontSize: "14px",
                  fontWeight: "600",
                  transition: "all 0.3s ease",
                }}
              >
                ← Prev
              </button>

              <div
                style={{
                  display: "flex",
                  gap: "4px",
                }}
              >
                {(() => {
                  const pagesPerWindow = 5;
                  const startPage = Math.max(1, currentPage - Math.floor(pagesPerWindow / 2));
                  const endPage = Math.min(totalPages, startPage + pagesPerWindow - 1);
                  const adjustedStart = Math.max(1, endPage - pagesPerWindow + 1);
                  
                  return Array.from(
                    { length: Math.min(pagesPerWindow, totalPages) },
                    (_, i) => adjustedStart + i
                  ).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      style={{
                        width: "36px",
                        height: "36px",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: "600",
                        transition: "all 0.3s ease",
                        background: currentPage === page ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" : "#f0f0f0",
                        color: currentPage === page ? "#fff" : "#333",
                      }}
                      onMouseEnter={(e) => {
                        if (currentPage !== page) {
                          e.currentTarget.style.background = "#e0e0e0";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (currentPage !== page) {
                          e.currentTarget.style.background = "#f0f0f0";
                        }
                      }}
                    >
                      {page}
                    </button>
                  ));
                })()}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                style={{
                  padding: "10px 16px",
                  background: currentPage === totalPages ? "#ccc" : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                  fontSize: "14px",
                  fontWeight: "600",
                  transition: "all 0.3s ease",
                }}
              >
                Next →
              </button>

              <div
                style={{
                  marginLeft: "20px",
                  fontSize: "14px",
                  color: "#666",
                  fontWeight: "500",
                  position: "relative",
                }}
              >
                <button
                  onClick={() => setShowPageMenu(!showPageMenu)}
                  style={{
                    background: "none",
                    border: "1px solid #ccc",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#666",
                    transition: "all 0.3s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#667eea";
                    e.currentTarget.style.color = "#667eea";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#ccc";
                    e.currentTarget.style.color = "#666";
                  }}
                >
                  Page {currentPage} of {totalPages}
                </button>

                {showPageMenu && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: "100%",
                      left: "0",
                      marginBottom: "8px",
                      background: "#fff",
                      border: "1px solid #ccc",
                      borderRadius: "8px",
                      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                      maxHeight: "300px",
                      overflowY: "auto",
                      zIndex: 1000,
                      minWidth: "100px",
                    }}
                  >
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => {
                          setCurrentPage(page);
                          setShowPageMenu(false);
                        }}
                        style={{
                          display: "block",
                          width: "100%",
                          padding: "10px 16px",
                          background: currentPage === page ? "#f0f0f0" : "transparent",
                          border: "none",
                          textAlign: "left",
                          cursor: "pointer",
                          fontSize: "14px",
                          color: currentPage === page ? "#667eea" : "#333",
                          fontWeight: currentPage === page ? "600" : "400",
                          transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#f5f5f5";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = currentPage === page ? "#f0f0f0" : "transparent";
                        }}
                      >
                        Page {page}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* PRODUCT DETAIL MODAL */}
      {selectedProduct && (
        <div
          onClick={() => setSelectedProduct(null)}
          className="modal-overlay"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="modal-pop"
            style={{
              width: "min(980px, 98%)",
              background: "#fff",
              borderRadius: 12,
              overflow: "hidden",
              display: "flex",
              gap: 0,
            }}
          >
            <div style={{ width: "48%", minHeight: 320, background: "#f6f7fb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 64 }}>
              {(() => {
                const img = selectedProduct.image || selectedProduct.img || selectedProduct.thumbnail || selectedProduct.picture || selectedProduct.image_url;
                if (img) {
                  return (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt={selectedProduct.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  );
                }
                return <div style={{ fontSize: 96 }}>{"💻"}</div>;
              })()}
            </div>

            <div style={{ width: "52%", padding: 24, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 22 }}>{selectedProduct.name}</h3>
                  <p style={{ margin: "6px 0", color: "#666" }}>{selectedProduct.desc}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#667eea" }}>${(selectedProduct.price || 0).toFixed(2)}</div>
                  <button onClick={() => setSelectedProduct(null)} style={{ marginTop: 8, padding: "6px 10px", borderRadius: 8, border: "1px solid #eee", background: "#fff", cursor: "pointer" }}>Close</button>
                </div>
              </div>

              {(() => {
                const rows: JSX.Element[] = [];

                const brand = selectedProduct.brand || selectedProduct.vendor;
                if (brand) rows.push(<div key="brand" style={{ minWidth: 120 }}><strong>Brand:</strong> {brand}</div>);

                if (selectedProduct.color) rows.push(<div key="color" style={{ minWidth: 120 }}><strong>Color:</strong> {selectedProduct.color}</div>);

                // RAM (can be string or object)
                let ramDisplay: string | null = null;
                if (selectedProduct.ram) {
                  if (typeof selectedProduct.ram === "string") ramDisplay = selectedProduct.ram;
                  else if (typeof selectedProduct.ram === "object" && selectedProduct.ram.size) ramDisplay = `${selectedProduct.ram.size} ${selectedProduct.ram.unit || ""}`;
                }
                if (ramDisplay) rows.push(<div key="ram" style={{ minWidth: 120 }}><strong>RAM:</strong> {ramDisplay}</div>);

                // Storage
                let storageDisplay: string | null = null;
                if (selectedProduct.storage) {
                  if (typeof selectedProduct.storage === "string") storageDisplay = selectedProduct.storage;
                  else if (selectedProduct.storage.primary && selectedProduct.storage.primary.capacity) storageDisplay = `${selectedProduct.storage.primary.capacity} ${selectedProduct.storage.primary.unit || ""}`;
                  else if (selectedProduct.storage.type) storageDisplay = selectedProduct.storage.type;
                }
                if (storageDisplay) rows.push(<div key="storage" style={{ minWidth: 120 }}><strong>Storage:</strong> {storageDisplay}</div>);

                const screenDisplay = selectedProduct.screen?.sizeInch || selectedProduct.screenSize || null;
                if (screenDisplay) rows.push(<div key="screen" style={{ minWidth: 120 }}><strong>Screen:</strong> {screenDisplay}</div>);

                if (selectedProduct.os) rows.push(<div key="os" style={{ minWidth: 120 }}><strong>OS:</strong> {selectedProduct.os}</div>);

                return rows.length > 0 ? <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>{rows}</div> : null;
              })()}

              {(selectedProduct.features && selectedProduct.features.length > 0) && (
                <div style={{ marginTop: 8 }}>
                  <strong>Features:</strong>
                  <ul style={{ margin: "8px 0 0 18px" }}>
                    {selectedProduct.features.map((f: any, idx: number) => (
                      <li key={idx}>{f}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  {[1,2,3,4,5].map((s) => (
                    <span key={s} style={{ color: s <= (selectedProduct.rating || 0) ? "#FFB800" : "#ddd", fontSize: 18 }}>★</span>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => { /* placeholder for Add to cart behavior */ }} style={{ padding: "10px 16px", borderRadius: 8, background: "#667eea", color: "#fff", border: "none", cursor: "pointer" }}>Add to Cart</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === CHAT FLOATING === */}
      <Chat username={username || ""} email={email || ""} searchHistory={searchHistory} onOpenProduct={setSelectedProduct} />
    </>
  );
}

/* ------------------------------------------------------------- */
/* --------------------- TON CHAT ENTIER ----------------------- */
/* ------------------------------------------------------------- */

function Chat({ username, email, searchHistory, onOpenProduct }: { username: string; email: string; searchHistory: string[]; onOpenProduct?: (p: any) => void }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const model = "mistral";
  const [loading, setLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<
    { id: string; messages: Message[]; timestamp: number }[]
  >([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(
    null
  );
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [chartOpenProducts, setChartOpenProducts] = useState<any[] | null>(null);
  const [chartOpenForMsg, setChartOpenForMsg] = useState<string | number | null>(null);
  const [featuresOpenProducts, setFeaturesOpenProducts] = useState<any[] | null>(null);
  const [featuresOpenForMsg, setFeaturesOpenForMsg] = useState<string | number | null>(null);

  // Helper: dedupe by id and cap at 6
  const dedupeConversations = (convs: { id: string; messages: Message[]; timestamp: number }[]) => {
    const seen = new Set<string>();
    const unique: typeof convs = [];
    for (const c of convs) {
      const id = c.id || "";
      if (!id || seen.has(id)) continue;
      seen.add(id);
      unique.push({ ...c, id });
      if (unique.length >= 6) break;
    }
    return unique;
  };

  // Safety net: ensure history never exceeds 6 and is deduped even if something slips through
  useEffect(() => {
    setConversationHistory((prev) => dedupeConversations(prev));
  }, []);

  // Listen for global event allowing the main page to open the price chart for arbitrary products
  useEffect(() => {
    const handler = (e: any) => {
      try {
        const prods = e?.detail?.products || null;
        if (Array.isArray(prods)) {
          setChartOpenProducts(prods);
          setChartOpenForMsg('external');
        }
      } catch (err) {
        // ignore malformed events
      }
    };
    window.addEventListener('openPriceChartFor', handler as EventListener);
    return () => window.removeEventListener('openPriceChartFor', handler as EventListener);
  }, []);

  // Load conversations from backend when chat opens
  useEffect(() => {
    if (open && email) {
      loadConversationsFromBackend();
    }
  }, [open, email]);

  const loadConversationsFromBackend = async () => {
    try {
      const res = await fetch("http://localhost:8000/conversations/get", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_email: email }),
      });
      const data = await res.json();
      if (data.conversations) {
        const formattedConversations = data.conversations.map((conv: any) => {
          const msgs = Array.isArray(conv.messages) ? conv.messages.map((m: any) => ({
            ...m,
            // normalize text field from possible shapes
            text: (m && (m.text ?? m.reply ?? m.response ?? '')) && String(m.text ?? m.reply ?? m.response ?? ''),
            // keep timestamp if present
            timestamp: m?.timestamp || null,
          })) : [];
          return {
            id: conv.conversation_id,
            messages: msgs,
            timestamp: conv.timestamp || (msgs.length ? (msgs[msgs.length-1].timestamp || Date.now()) : Date.now()),
          };
        });
        setConversationHistory(dedupeConversations(formattedConversations));
      }
    } catch (err) {
      console.error("Failed to load conversations:", err);
    }
  };

  const saveConversationToBackend = async (convId: string, msgs: Message[]) => {
    if (!email) return;
    try {
      await fetch("http://localhost:8000/conversations/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_email: email,
          conversation_id: convId,
          messages: msgs.map(m => ({ ...m, timestamp: Date.now() })),
        }),
      });
    } catch (err) {
      console.error("Failed to save conversation:", err);
    }
  };

  const startNewConversation = () => {
    if (conversationHistory.length >= 6) {
      return; // Button is already disabled, but extra safety check
    }
    // Create a new conversation id immediately so subsequent messages
    // reliably save under this id and show up in history.
    const newId = Date.now().toString();
    setMessages([]);
    setCurrentConversationId(newId);
    // Add to local history right away
    setConversationHistory((prev) => dedupeConversations([
      { id: newId, messages: [], timestamp: Date.now() },
      ...prev,
    ]));
    // Persist empty conversation record to backend so it's reserved
    if (email) {
      try {
        saveConversationToBackend(newId, []);
      } catch (e) {
        // ignore; backend may be offline
      }
    }
  };

  const deleteConversation = async (convId: string) => {
    if (!email) return;
    try {
      const response = await fetch("http://localhost:8000/conversations/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_email: email,
          conversation_id: convId,
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to delete conversation");
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Remove from local state
        setConversationHistory(prev => prev.filter(c => c.id !== convId));
        // If deleting current conversation, clear messages
        if (currentConversationId === convId) {
          setMessages([]);
          setCurrentConversationId(null);
        }
        // Reload from backend to stay in sync
        loadConversationsFromBackend();
      } else {
        console.error("Delete failed:", data);
        alert("Failed to delete conversation");
      }
    } catch (err) {
      console.error("Failed to delete conversation:", err);
      alert("Error deleting conversation");
    }
  };

  const requestProductRecommendations = async () => {
    const lastSearch = searchHistory.length > 0 ? searchHistory[0] : null;
    try {
      setLoading(true);
      const res = await fetch("http://localhost:8000/api/greeting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, lastSearch }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { 
        sender: "bot", 
        text: data.greeting, 
        model: "mistral",
        products: data.products || []
      }]);
    } catch (err) {
      console.error("Error getting greeting:", err);
      setMessages(prev => [...prev, { sender: "bot", text: `Hi ${username}, how can I help you today!`, model: "mistral" }]);
    } finally {
      setLoading(false);
    }
  };

  const loadConversation = (id: string) => {
    const conversation = conversationHistory.find((c) => c.id === id);
    if (conversation) {
      setMessages(conversation.messages);
      setCurrentConversationId(id);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    let conversationId = currentConversationId;
    
    // If this is the first message in a new conversation, create a conversation ID
    if (messages.length === 0 && !conversationId) {
      conversationId = Date.now().toString();
      setCurrentConversationId(conversationId);
    }

    setMessages((prev) => [...prev, { sender: "user", text: input }]);
    setLoading(true);

    const loaderId = Math.random().toString();
    setMessages((prev) => [
      ...prev,
      { sender: "bot", text: "...", model, id: loaderId },
    ]);

    try {
      const res = await fetch("http://localhost:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input, model }),
      });

      const data = await res.json();

      let updatedMessages: Message[] = [];

      setMessages((prev) => {
        updatedMessages = prev.map((msg) =>
          msg.id === loaderId
            ? { sender: "bot", text: data.reply || data.response || "", model, products: data.products || [] }
            : msg
        );
        return updatedMessages;
      });

      // Save to backend after every message exchange (outside setState to avoid StrictMode double-invoke)
      if (conversationId) {
        saveConversationToBackend(conversationId, updatedMessages);
      }

      // Save to history after every message exchange using the consistent conversationId
      setConversationHistory((hist) => {
        const exists = hist.find((c) => c.id === conversationId);
        const nextList = exists
          ? hist.map((c) =>
              c.id === conversationId
                ? { ...c, messages: updatedMessages, timestamp: Date.now() }
                : c
            )
          : [
              {
                id: conversationId || "",
                messages: updatedMessages,
                timestamp: Date.now(),
              },
              ...hist,
            ];
        return dedupeConversations(nextList);
      });
    } catch (err) {
      console.error("Error:", err);

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === loaderId
            ? { sender: "bot", text: "Error: Failed to fetch reply.", model }
            : msg
        )
      );
    }

    setInput("");
    setLoading(false);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) =>
    setInput(e.target.value);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") sendMessage();
  };

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  return (
    <>
      <style>{`
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        .chat-bubble-enter { animation: slideInUp 0.3s ease-out; }
      `}</style>

      {/* History integrated into chat popup - removed separate button */}

      {/* FLOATING BUTTON */}

      {/* FLOATING BUTTON */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "#fff",
          border: "none",
          fontSize: "24px",
          cursor: "pointer",
          boxShadow: "0 8px 25px rgba(102, 126, 234, 0.4)",
          zIndex: 9999,
          transition: "all 0.3s ease",
          animation: open ? "none" : "pulse 2s ease-in-out infinite",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.1)";
          e.currentTarget.style.boxShadow = "0 12px 35px rgba(102, 126, 234, 0.5)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow = "0 8px 25px rgba(102, 126, 234, 0.4)";
        }}
      >
        💬
      </button>

      {/* CHAT POPUP WITH INTEGRATED HISTORY SIDEBAR */}
      {open && (
        <div
          style={{
            position: "fixed",
            bottom: "90px",
            right: "24px",
            width: "700px",
            height: "550px",
            backgroundColor: "#fff",
            borderRadius: "20px",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
            zIndex: 9998,
            display: "flex",
            flexDirection: "row",
            overflow: "hidden",
            animation: "slideInUp 0.3s ease-out",
            border: "1px solid rgba(0, 0, 0, 0.05)",
          }}
        >
          {/* LEFT SIDEBAR - HISTORY */}
          <div
            style={{
              width: "200px",
              backgroundColor: "#f8f9fa",
              borderRight: "1px solid #e0e0e0",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* History Header */}
            <div
              style={{
                padding: "16px",
                borderBottom: "1px solid #e0e0e0",
                backgroundColor: "#fff",
              }}
            >
              <h4
                style={{
                  margin: "0",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#333",
                }}
              >
                  History
              </h4>
            </div>

            {/* New Chat Button */}
            <div style={{ margin: "12px" }}>
              <button
                onClick={startNewConversation}
                disabled={conversationHistory.length >= 6}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  background: conversationHistory.length >= 6 
                    ? "#ccc" 
                    : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  cursor: conversationHistory.length >= 6 ? "not-allowed" : "pointer",
                  fontWeight: "600",
                  fontSize: "12px",
                  transition: "all 0.2s ease",
                  opacity: conversationHistory.length >= 6 ? 0.6 : 1,
                }}
                onMouseEnter={(e) => {
                  if (conversationHistory.length < 6) {
                    e.currentTarget.style.transform = "scale(1.02)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (conversationHistory.length < 6) {
                    e.currentTarget.style.transform = "scale(1)";
                  }
                }}
              >
                + New Chat
              </button>
              {conversationHistory.length >= 6 && (
                <div
                  style={{
                    fontSize: "10px",
                    color: "#ff4444",
                    marginTop: "6px",
                    textAlign: "center",
                    fontWeight: "500",
                  }}
                >
                  Delete a chat to create new one
                </div>
              )}
            </div>

            {/* Conversations List */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "8px",
              }}
            >
              {conversationHistory.length === 0 ? (
                <div
                  style={{
                    padding: "16px 12px",
                    textAlign: "center",
                    color: "#999",
                    fontSize: "12px",
                  }}
                >
                  No chats yet
                </div>
              ) : (
                conversationHistory.map((conv) => (
                  <div
                    key={conv.id}
                    style={{
                      position: "relative",
                      margin: "4px 0",
                    }}
                  >
                    <button
                      onClick={() => loadConversation(conv.id)}
                      style={{
                        width: "100%",
                        padding: "10px 32px 10px 12px",
                        backgroundColor:
                          currentConversationId === conv.id ? "#e8eaff" : "transparent",
                        border: "1px solid #e0e0e0",
                        borderRadius: "8px",
                        textAlign: "left",
                        cursor: "pointer",
                        fontSize: "11px",
                        color: "#333",
                        transition: "all 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#e8eaff";
                      }}
                      onMouseLeave={(e) => {
                        if (currentConversationId !== conv.id) {
                          e.currentTarget.style.backgroundColor = "transparent";
                        }
                      }}
                    >
                      <div
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontWeight: "500",
                        }}
                      >
                        {(conv.messages?.find((m: any) => m?.text && String(m.text).trim())?.text?.substring(0, 30)) || "Empty"}...
                      </div>
                      <div
                        style={{
                          fontSize: "10px",
                          color: "#999",
                          marginTop: "2px",
                        }}
                      >
                        {new Date(conv.timestamp).toLocaleTimeString()}
                      </div>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("Are you sure you want to delete this conversation?")) {
                          deleteConversation(conv.id);
                        }
                      }}
                      style={{
                        position: "absolute",
                        right: "8px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        width: "24px",
                        height: "24px",
                        background: "#ff4444",
                        color: "#fff",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "12px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#cc0000";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "#ff4444";
                      }}
                      title="Delete conversation"
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* RIGHT SIDE - CHAT AREA */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* HEADER */}
            <div
              style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "#fff",
                padding: "16px",
                fontWeight: "600",
                fontSize: "16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              💬 Chat
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: "rgba(255, 255, 255, 0.2)",
                  border: "none",
                  color: "#fff",
                  cursor: "pointer",
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "16px",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
                }}
              >
                ✕
              </button>
            </div>

            {/* MODEL: fixed to EiLShop Chatbot backend (mistral) */}

            {/* MESSAGES */}
            <div
              ref={chatContainerRef}
              style={{
                flex: 1,
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                overflowY: "auto",
                backgroundColor: "#f8f9fa",
                scrollBehavior: "smooth",
              }}
            >
              {messages.length === 0 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100%",
                    color: "#999",
                    fontSize: "14px",
                    textAlign: "center",
                  }}
                >
                  Start a conversation! 👋
                </div>
              )}
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className="chat-bubble-enter"
                  style={{
                    display: "flex",
                    justifyContent: msg.sender === "user" ? "flex-end" : "flex-start",
                  }}
                >
                  <div
                    style={{
                      maxWidth: "80%",
                      padding: "10px 14px",
                      borderRadius: "14px",
                      wordBreak: "break-word",
                      fontSize: "14px",
                      lineHeight: "1.4",
                      backgroundColor:
                        msg.sender === "user" ? "#DCF8C6" : "#F1F0F0",
                      color: "#333",
                    }}
                  >
                    {msg.sender === "bot" && msg.model && (
                      <div
                        style={{
                          fontSize: "11px",
                          opacity: 0.7,
                          marginBottom: "4px",
                        }}
                      >
                        {msg.model === "mistral" ? "EiLShop Chatbot" : `${msg.model.charAt(0).toUpperCase()}${msg.model.slice(1)}`}
                      </div>
                    )}
                    <span dangerouslySetInnerHTML={{ __html: typeof msg.text === "string" ? msg.text : String(msg.text || "") }} />
                    
                    {/* Product Cards */}
                    {msg.products && msg.products.length > 0 && (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                          gap: "10px",
                          marginTop: "12px",
                        }}
                      >
                        {msg.products.map((product) => (
                          <div
                            key={product._id}
                            style={{
                              backgroundColor: "#fff",
                              borderRadius: "12px",
                              padding: "12px",
                              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                              transition: "all 0.3s ease",
                              cursor: "pointer",
                            }}
                            onClick={() => { if (typeof onOpenProduct === 'function') onOpenProduct(product); else openProductUrl(product); }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = "translateY(-4px)";
                              e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = "translateY(0)";
                              e.currentTarget.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.1)";
                            }}
                          >
                            {/* Product Image (use product-specific image when available) */}
                            {(
                              product.image || product.img || product.thumbnail || product.thumb || product.image_url || product.picture
                            ) ? (
                              <img
                                src={
                                  product.image || product.img || product.thumbnail || product.thumb || product.image_url || product.picture
                                }
                                alt={product.name || "product"}
                                style={{ width: "100%", height: "100px", objectFit: "cover", borderRadius: "8px", marginBottom: "8px" }}
                              />
                            ) : (
                              (() => {
                                const icons = ["📱", "⌚", "💻", "🎧", "📷", "🎮"];
                                const key = (product._id || product.name || "").toString();
                                let sum = 0;
                                for (let i = 0; i < key.length; i++) sum += key.charCodeAt(i);
                                const emoji = icons[sum % icons.length];
                                return (
                                  <div
                                    style={{
                                      width: "100%",
                                      height: "100px",
                                      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                      borderRadius: "8px",
                                      marginBottom: "8px",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontSize: "32px",
                                    }}
                                  >
                                    {emoji}
                                  </div>
                                );
                              })()
                            )}
                            {/* Product Title */}
                            <div
                              style={{
                                fontSize: "13px",
                                fontWeight: "600",
                                color: "#333",
                                marginBottom: "4px",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {product.name}
                            </div>
                            {/* Product Price */}
                            <div
                              style={{
                                fontSize: "14px",
                                fontWeight: "700",
                                color: "#667eea",
                                marginBottom: "6px",
                              }}
                            >
                              ${product.price}
                            </div>
                            {/* Product Rating */}
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "2px",
                              }}
                            >
                              {[1, 2, 3, 4, 5].map((star) => (
                                <span
                                  key={star}
                                  style={{
                                    fontSize: "14px",
                                    color: star <= (product.rating || 0) ? "#FFB800" : "#ddd",
                                  }}
                                >
                                  ★
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {msg.products && msg.products.length > 0 && (
                      <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end", gap: 8 }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setChartOpenProducts(msg.products || []);
                            setChartOpenForMsg(msg.id ?? idx);
                          }}
                          style={{
                            padding: "8px 12px",
                            background: "#FFD54F",
                            color: "#111",
                            border: "none",
                            borderRadius: 8,
                            cursor: "pointer",
                            fontWeight: 700,
                            boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
                          }}
                        >
                          Show comparison
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setFeaturesOpenProducts(msg.products || []);
                            setFeaturesOpenForMsg(msg.id ?? idx);
                          }}
                          style={{
                            padding: "8px 12px",
                            background: "#eef2ff",
                            color: "#1e3a8a",
                            border: "1px solid #c7d2fe",
                            borderRadius: 8,
                            cursor: "pointer",
                            fontWeight: 700,
                            boxShadow: "0 6px 18px rgba(99,102,241,0.06)",
                          }}
                        >
                          Compare features
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* QUICK ACTION BUBBLES */}
            <div
              style={{
                padding: "12px 16px 0 16px",
                backgroundColor: "#f8f9fa",
                display: "flex",
                gap: "8px",
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={requestProductRecommendations}
                disabled={loading}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#fff",
                  border: "1px solid #667eea",
                  borderRadius: "20px",
                  color: "#667eea",
                  fontSize: "13px",
                  fontWeight: "500",
                  cursor: loading ? "not-allowed" : "pointer",
                  transition: "all 0.3s ease",
                  opacity: loading ? 0.6 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.backgroundColor = "#667eea";
                    e.currentTarget.style.color = "#fff";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#fff";
                  e.currentTarget.style.color = "#667eea";
                }}
              >
                💡 Recommend products
              </button>
            </div>

            {/* INPUT */}
            <div
              style={{
                display: "flex",
                gap: "10px",
                padding: "16px",
                backgroundColor: "#f8f9fa",
                borderTop: "1px solid #e0e0e0",
              }}
            >
              <input
                type="text"
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={loading ? "Waiting..." : "Type a message..."}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  fontSize: "14px",
                  border: "1px solid #e0e0e0",
                  borderRadius: "10px",
                  outline: "none",
                  backgroundColor: loading ? "#f0f0f0" : "#fff",
                  transition: "all 0.2s ease",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#667eea";
                  e.target.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#e0e0e0";
                  e.target.style.boxShadow = "none";
                }}
              />
              <button
                onClick={sendMessage}
                disabled={loading}
                style={{
                  padding: "10px 16px",
                  background: loading
                    ? "#ccc"
                    : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "10px",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontSize: "16px",
                  fontWeight: "600",
                  transition: "all 0.3s ease",
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.transform = "scale(1.05)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                →
              </button>
            </div>
          </div>
        </div>
      )}

      {chartOpenProducts && (
        <div
          onClick={() => {
            setChartOpenProducts(null);
            setChartOpenForMsg(null);
          }}
          className="modal-overlay"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="modal-pop"
            style={{
              width: "min(920px, 96%)",
              maxHeight: "80%",
              overflow: "auto",
              background: "#fff",
              borderRadius: 12,
              padding: 20,
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, letterSpacing: -0.2 }}>Product comparison</h2>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button onClick={() => { setChartOpenProducts(null); setChartOpenForMsg(null); }} style={{ padding: "8px 12px", borderRadius: 10, border: "none", background: "#f3f4f6", cursor: "pointer", fontWeight: 600 }}>Close</button>
              </div>
            </div>

            {/* Modern two-column layout */}
            {(() => {
              const prods = chartOpenProducts || [];
              const labels = prods.map((p: any) => p.name || p._id || "item");
              const priceVals = prods.map((p: any) => Number(p.price) || 0);
              // prepare Chart.js data
              const chartData = {
                labels: labels.map((l: string, i: number) => (l.length > 30 ? l.slice(0, 27) + '...' : l)),
                datasets: [
                  {
                    label: 'Price (USD) ',
                    data: priceVals,
                    backgroundColor: 'rgba(255, 181, 51, 0.85)',
                    borderColor: 'rgba(255, 140, 0, 0.9)',
                    borderWidth: 1,
                  },
                ],
              };
              const chartOptions = {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  title: { display: false },
                  tooltip: { mode: 'index', intersect: false },
                },
                scales: {
                  x: { ticks: { maxRotation: 45, minRotation: 0 } },
                  y: { beginAtZero: true },
                },
              };
              const ratingVals = prods.map((p: any) => Number(p.rating) || 0);
              const maxPrice = Math.max(...priceVals, 1);
              const maxRating = Math.max(...ratingVals, 5);

              // parse additional specs (ram, storage, screen) into numeric values when possible
              const parseNumber = (v: any) => {
                if (v == null) return null;
                if (typeof v === "number") return v;
                if (typeof v === "string") {
                  const m = v.replace(/[,]/g, "").match(/([0-9]+(\.[0-9]+)?)/);
                  return m ? Number(m[1]) : null;
                }
                if (typeof v === "object") {
                  // common shapes: { size: 8, unit: 'GB' } or { primary: { capacity: 128 } }
                  if (v.size) return parseNumber(v.size);
                  if (v.capacity) return parseNumber(v.capacity);
                  if (v.primary && v.primary.capacity) return parseNumber(v.primary.capacity);
                }
                return null;
              };

              const ramVals = prods.map((p: any) => {
                return parseNumber(p.ram) || parseNumber(p.memory) || (p.ram && typeof p.ram === 'string' && Number(p.ram.replace(/[^0-9.]/g,''))) || null;
              });
              const storageVals = prods.map((p: any) => {
                return parseNumber(p.storage) || parseNumber(p.capacity) || null;
              });
              const screenVals = prods.map((p: any) => parseNumber(p.screen?.sizeInch || p.screenSize || p.screen?.inch || p.screen));


              const hasNumeric = (arr: any[]) => arr.some(v => typeof v === 'number' && !isNaN(v));

              const maxRam = Math.max(...ramVals.map(v=>v||0), 1);
              const maxStorage = Math.max(...storageVals.map(v=>v||0), 1);
              const maxScreen = Math.max(...screenVals.map(v=>v||0), 1);

              const hasRam = hasNumeric(ramVals) || prods.some((p: any) => p.ram || p.memory);
              const hasStorage = hasNumeric(storageVals) || prods.some((p: any) => p.storage || p.capacity);
              const hasScreen = hasNumeric(screenVals) || prods.some((p: any) => p.screen?.sizeInch || p.screenSize);

              return (
                <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
                  <div style={{ flex: "1 1 60%", minWidth: 320, background: "#fff", padding: 18, borderRadius: 12, boxShadow: "0 8px 30px rgba(15,23,42,0.06)" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                          {/* Price */}
                          <div style={{ height: 300, marginBottom: 8 }}>
                            <Bar data={chartData} options={chartOptions as any} />
                          </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 8, color: "#0f172a" }}>Price</div>
                        {prods.map((p: any, i: number) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                            <div style={{ width: 160, fontSize: 13, color: "#111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{labels[i]}</div>
                            <div style={{ flex: 1, background: "#f3f4f6", height: 14, borderRadius: 8, overflow: "hidden" }}>
                              <div style={{ width: `${(priceVals[i] / maxPrice) * 100}%`, height: "100%", background: "linear-gradient(90deg,#ffd54f,#ffb300)", boxShadow: "inset 0 -2px 6px rgba(0,0,0,0.06)" }} />
                            </div>
                            <div style={{ width: 90, textAlign: "right", fontWeight: 700 }}>${priceVals[i].toFixed(2)}</div>
                          </div>
                        ))}
                      </div>

                      {/* Rating is shown on the product cards (right column); omitted here */}

                      {/* Specs grid */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
                        {/* RAM */}
                        {hasRam && (
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", marginBottom: 6 }}>RAM</div>
                          {hasNumeric(ramVals) ? (
                              ramVals.map((v: any, i: number) => (
                                v ? (
                                  <div key={`ram-${i}`} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                                    <div style={{ width: 160, fontSize: 13, color: "#111" }}>{labels[i]}</div>
                                    <div style={{ flex: 1, background: "#f3f4f6", height: 10, borderRadius: 8, overflow: "hidden" }}>
                                      <div style={{ width: `${((ramVals[i]||0) / maxRam) * 100}%`, height: "100%", background: "linear-gradient(90deg,#a5d6a7,#66bb6a)" }} />
                                    </div>
                                    <div style={{ width: 80, textAlign: "right", fontSize: 12 }}>{ramVals[i] ? `${ramVals[i]} GB` : "—"}</div>
                                  </div>
                                ) : null
                              ))
                            ) : (
                              prods.map((p: any, i: number) => (
                                (p.ram || p.memory) ? (
                                  <div key={`ramtxt-${i}`} style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
                                    <div style={{ width: 160, fontSize: 13, color: "#111" }}>{labels[i]}</div>
                                    <div style={{ fontSize: 13, color: "#666" }}>{p.ram || p.memory}</div>
                                  </div>
                                ) : null
                              ))
                            )}
                        </div>
                        )}

                        {/* Storage */}
                        {hasStorage && (
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", marginBottom: 6 }}>Storage</div>
                          {hasNumeric(storageVals) ? (
                            storageVals.map((v: any, i: number) => (
                              v ? (
                                <div key={`sto-${i}`} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                                  <div style={{ width: 160, fontSize: 13, color: "#111" }}>{labels[i]}</div>
                                    <div style={{ flex: 1, background: "#f3f4f6", height: 10, borderRadius: 8, overflow: "hidden" }}>
                                    <div style={{ width: `${((storageVals[i]||0) / maxStorage) * 100}%`, height: "100%", background: "linear-gradient(90deg,#90caf9,#42a5f5)" }} />
                                  </div>
                                  <div style={{ width: 80, textAlign: "right", fontSize: 12 }}>{storageVals[i] ? `${storageVals[i]} GB` : "—"}</div>
                                </div>
                              ) : null
                            ))
                          ) : (
                            prods.map((p: any, i: number) => (
                              (p.storage || p.capacity) ? (
                                <div key={`stotxt-${i}`} style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
                                  <div style={{ width: 160, fontSize: 13, color: "#111" }}>{labels[i]}</div>
                                  <div style={{ fontSize: 13, color: "#666" }}>{p.storage || p.capacity}</div>
                                </div>
                              ) : null
                            ))
                          )}
                        </div>
                        )}

                        {/* Screen */}
                        {hasScreen && (
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", marginBottom: 6 }}>Screen (inch)</div>
                          {hasNumeric(screenVals) ? (
                            screenVals.map((v: any, i: number) => (
                              v ? (
                                <div key={`scr-${i}`} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                                  <div style={{ width: 160, fontSize: 13, color: "#111" }}>{labels[i]}</div>
                                  <div style={{ flex: 1, background: "#f3f4f6", height: 10, borderRadius: 8, overflow: "hidden" }}>
                                    <div style={{ width: `${((screenVals[i]||0) / maxScreen) * 100}%`, height: "100%", background: "linear-gradient(90deg,#b39ddb,#9575cd)" }} />
                                  </div>
                                  <div style={{ width: 80, textAlign: "right", fontSize: 12 }}>{screenVals[i] ? `${screenVals[i]}"` : "—"}</div>
                                </div>
                              ) : null
                            ))
                          ) : (
                            prods.map((p: any, i: number) => (
                              (p.screen?.sizeInch || p.screenSize) ? (
                                <div key={`scrtxt-${i}`} style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
                                  <div style={{ width: 160, fontSize: 13, color: "#111" }}>{labels[i]}</div>
                                  <div style={{ fontSize: 13, color: "#666" }}>{p.screen?.sizeInch || p.screenSize}</div>
                                </div>
                              ) : null
                            ))
                          )}
                        </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ flex: "1 1 34%", minWidth: 220, display: "flex", flexDirection: "column", gap: 12 }}>
                    {prods.map((p: any, i: number) => (
                      <div key={`card-${i}`} style={{ background: "#fff", borderRadius: 12, padding: 12, boxShadow: "0 8px 24px rgba(15,23,42,0.06)", display: "flex", gap: 12, alignItems: "center" }}>
                        <div style={{ width: 64, height: 64, borderRadius: 8, background: "linear-gradient(135deg,#eef2ff,#e9d5ff)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>
                          {p.image || p.img || p.thumbnail ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.image || p.img || p.thumbnail} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 6 }} />
                          ) : (
                            <div style={{ fontSize: 28 }}>{["📱","⌚","💻","🎧","📷","🎮"][i % 6]}</div>
                          )}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "#111", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              {([1,2,3,4,5] as number[]).map((s) => (
                                <span key={s} style={{ fontSize: 14, color: s <= Math.round(p.rating || 0) ? "#FFB800" : "#E6E6E6" }}>★</span>
                              ))}
                            </div>
                            <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>${(Number(p.price)||0).toFixed(2)}</div>
                          </div>
                          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 8 }}>{p.ram ? `${p.ram} • ${p.storage || ''}` : p.storage || ''}</div>
                          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
                            {p.color || p.colour ? `Color: ${p.color || p.colour}` : null}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
      {featuresOpenProducts && (
        <div
          onClick={() => {
            setFeaturesOpenProducts(null);
            setFeaturesOpenForMsg(null);
          }}
          className="modal-overlay"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10001,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="modal-pop"
            style={{
              width: "min(820px, 96%)",
              maxHeight: "80%",
              overflow: "auto",
              background: "#fff",
              borderRadius: 12,
              padding: 18,
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, letterSpacing: -0.2 }}>Feature comparison</h2>
                <div style={{ fontSize: 13, color: "#6b7280", marginTop: 6 }}>Showing features for each product</div>
              </div>
              <div>
                <button onClick={() => { setFeaturesOpenProducts(null); setFeaturesOpenForMsg(null); }} style={{ padding: "8px 12px", borderRadius: 10, border: "none", background: "#f3f4f6", cursor: "pointer", fontWeight: 600 }}>Close</button>
              </div>
            </div>

            {(() => {
              const prods = featuresOpenProducts || [];
              const labels = prods.map((p: any) => p.name || p._id || "item");

              // Try to extract features as either arrays or objects
              const feats = prods.map((p: any) => {
                if (Array.isArray(p.features) && p.features.length) return { type: 'list', value: p.features.map(String) };
                if (p.features && typeof p.features === 'object') return { type: 'obj', value: p.features };
                if (p.specs && typeof p.specs === 'object') return { type: 'obj', value: p.specs };
                return { type: 'none', value: p.desc || null };
              });

              const hasList = feats.some(f => f.type === 'list');
              const hasObj = feats.some(f => f.type === 'obj');

              if (hasList) {
                const union = new Set<string>();
                feats.forEach(f => { if (f.type === 'list') f.value.forEach((x: string) => union.add(x)); });
                const rows = Array.from(union);
                return (
                  <div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                      <div style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 5, paddingBottom: 8, borderBottom: '1px solid #eef2ff' }}>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                          <div style={{ width: 220 }} />
                          <div style={{ display: 'flex', gap: 12 }}>
                            {prods.map((p: any, i: number) => (
                              <div key={`hdr-${i}`} style={{ minWidth: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: 56, height: 56, borderRadius: 8, overflow: 'hidden', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  {p.image || p.img || p.thumbnail ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={p.image || p.img || p.thumbnail} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  ) : (
                                    <div style={{ fontSize: 22 }}>{["📱","⌚","💻","🎧","📷","🎮"][i % 6]}</div>
                                  )}
                                </div>
                                <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', textAlign: 'center' }}>{p.name || p._id || `Item ${i+1}`}</div>
                                <div style={{ fontSize: 12, color: '#374151', fontWeight: 700 }}>${(Number(p.price)||0).toFixed(0)}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      {rows.map((r, ri) => (
                        <div key={`featrow-${ri}`} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f3f4f6', background: ri % 2 === 0 ? '#fff' : '#fbfdfe' }}>
                          <div style={{ width: 220, fontWeight: 700 }}>{r}</div>
                          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            {prods.map((p: any, i: number) => (
                              <div key={`val-${i}-${ri}`} style={{ minWidth: 120, fontSize: 13, textAlign: 'center' }}>
                                {(Array.isArray(p.features) && p.features.includes(r)) ? (
                                  <span style={{ color: '#16a34a', fontWeight: 800, fontSize: 16 }}>✓</span>
                                ) : (
                                  <span style={{ color: '#ef4444', fontWeight: 800, fontSize: 16 }}>✕</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 12, fontSize: 13, color: '#6b7280' }}>
                      Tip: rows show presence of listed features in each product.
                    </div>
                  </div>
                );
              }

              if (hasObj) {
                const keys = new Set<string>();
                feats.forEach(f => { if (f.type === 'obj') Object.keys(f.value || {}).forEach(k => keys.add(k)); });
                const rows = Array.from(keys);
                return (
                  <div style={{ display: 'grid', gap: 8 }}>
                        <div style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 5, paddingBottom: 8, borderBottom: '1px solid #eef2ff' }}>
                          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            <div style={{ width: 220 }} />
                            <div style={{ display: 'flex', gap: 12 }}>
                              {prods.map((p: any, i: number) => (
                                <div key={`hdrobj-${i}`} style={{ minWidth: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                                  <div style={{ width: 56, height: 56, borderRadius: 8, overflow: 'hidden', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {p.image || p.img || p.thumbnail ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img src={p.image || p.img || p.thumbnail} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                      <div style={{ fontSize: 22 }}>{["📱","⌚","💻","🎧","📷","🎮"][i % 6]}</div>
                                    )}
                                  </div>
                                  <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', textAlign: 'center' }}>{p.name || p._id || `Item ${i+1}`}</div>
                                  <div style={{ fontSize: 12, color: '#374151', fontWeight: 700 }}>${(Number(p.price)||0).toFixed(0)}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                    {rows.map((k, ki) => (
                      <div key={`objrow-${ki}`} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '6px 0', borderBottom: '1px solid #f3f4f6' }}>
                        <div style={{ width: 220, fontWeight: 700 }}>{k}</div>
                        <div style={{ display: 'flex', gap: 12 }}>
                          {prods.map((p: any, i: number) => (
                            <div key={`objval-${i}-${ki}`} style={{ minWidth: 120, fontSize: 13, color: '#111' }}>
                              {((p.features && p.features[k]) || (p.specs && p.specs[k])) ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ color: '#16a34a', fontWeight: 800 }}>✓</span>
                                  <span style={{ color: '#111' }}>{String((p.features && p.features[k]) || (p.specs && p.specs[k]))}</span>
                                </div>
                              ) : (
                                <span style={{ color: '#ef4444', fontWeight: 800 }}>✕</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              }

              // Fallback: show each product's desc or features text
              return (
                <div style={{ display: 'grid', gap: 12 }}>
                  {prods.map((p: any, i: number) => (
                    <div key={`fb-${i}`} style={{ background: '#f8fafc', padding: 12, borderRadius: 8 }}>
                      <div style={{ fontWeight: 800, marginBottom: 6 }}>{labels[i]}</div>
                      <div style={{ fontSize: 13, color: '#333' }}>{Array.isArray(p.features) ? p.features.join(', ') : (p.features || p.desc || 'No features available')}</div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </>
  );
}
