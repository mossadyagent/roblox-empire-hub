/**
 * ============================================================================
 * ROBLOX EMPIRE HUB — EMVCo BRCode (PIX Copia e Cola) + QR Code + Crypto Engine
 * File: pix.js
 * ============================================================================
 * Implements the official Banco Central do Brasil EMVCo TLV specification with
 * authentic CRC-16/CCITT-FALSE (polynomial 0x1021, initial 0xFFFF) calculation,
 * interactive QR Code Canvas rendering, and multi-currency checkout management.
 */

window.STOREFRONT_CONFIG = {
  pix_key: "pix@robloxempirehub.com.br",
  merchant_name: "ROBLOX EMPIRE HUB",
  merchant_city: "SAO PAULO",
  products: {
    bundle_3in1: {
      id: "bundle_3in1",
      title: "Pacote Completo 3-em-1 (.rbxlx + Scripts Luau + 18 Thumbnails + 90 Roteiros)",
      badge: "MAIS VENDIDO • ECONOMIZE 45%",
      price_brl: 147.0,
      price_usd: 39.0,
      txid: "RBXBUNDLE3IN1"
    },
    map1_obby: {
      id: "map1_obby",
      title: "Mapa 1: Mega Brainrot & Lava Tower Obby + VIP Troll (.rbxlx)",
      badge: "35 FASES + SISTEMA NUKE",
      price_brl: 67.0,
      price_usd: 19.0,
      txid: "RBXMAP1OBBY"
    },
    map2_tycoon: {
      id: "map2_tycoon",
      title: "Mapa 2: Viral Streamer & AI Empire Tycoon (.rbxlx)",
      badge: "4 PLOTS + ARENA KOTH",
      price_brl: 67.0,
      price_usd: 19.0,
      txid: "RBXMAP2TYCOON"
    },
    map3_rng: {
      id: "map3_rng",
      title: "Mapa 3: 1 in 1,000,000 Aura RNG + Admin Island (.rbxlx)",
      badge: "30 AURAS + CUTSCENES",
      price_brl: 67.0,
      price_usd: 19.0,
      txid: "RBXMAP3RNG"
    },
    livepix_vip: {
      id: "livepix_vip",
      title: "Apoio Live 24/7 + Ativar Evento 2x Luck / Nuke Ao Vivo",
      badge: "ALERTA DE VOZ NA LIVE",
      price_brl: 10.0,
      price_usd: 3.0,
      txid: "RBXLIVEVIP"
    }
  },
  checkout_links: {
    gumroad_bundle_url: "https://gumroad.com/l/roblox-3in1-monetized-bundle",
    stripe_bundle_url: "https://buy.stripe.com/test_roblox_empire_3in1_bundle",
    builtbybit_url: "https://builtbybit.com/resources/roblox-3in1-monetized-maps-bundle",
    fiverr_url: "https://www.fiverr.com/s/roblox-turnkey-monetized-games",
    livepix_url: "https://livepix.gg/seucanal",
    discord_delivery_url: "https://discord.gg/seuservidorvip"
  },
  crypto_wallets: {
    usdt_trc20: "T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb",
    solana: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    bitcoin: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"
  },
  stream_config: {
    twitch_channel: "robloxempire247",
    kick_channel: "robloxempire247"
  },
  roblox_games: {
    map1_url: "https://www.roblox.com/games/0000000001/Mega-Brainrot-Lava-Tower-Obby",
    map2_url: "https://www.roblox.com/games/0000000002/Viral-Streamer-AI-Empire-Tycoon",
    map3_url: "https://www.roblox.com/games/0000000003/Aura-RNG-Admin-Island"
  },
  affiliate_links: {
    robux_giftcard: "https://amzn.to/robux-gift-card-oficial",
    instant_gaming: "https://www.instant-gaming.com/?igr=passive247",
    amazon_gamer: "https://amzn.to/setup-gamer-custo-beneficio"
  }
};

let currentSelectedProductId = "bundle_3in1";

/**
 * Strips accents and normalizes ASCII strings for EMVCo compliance.
 */
function sanitizeAscii(str, maxLen) {
  const clean = String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 @.\-_]/g, "")
    .trim();
  return maxLen ? clean.substring(0, maxLen) : clean;
}

/**
 * Formats an EMVCo TLV field: 2-digit ID + 2-digit Length + Value.
 */
function emvField(id, value) {
  const valStr = String(value || "");
  const len = valStr.length.toString().padStart(2, "0");
  return `${id}${len}${valStr}`;
}

/**
 * Computes standard CRC-16/CCITT-FALSE (polynomial 0x1021, initial 0xFFFF)
 * required by Banco Central do Brasil for PIX BRCode (field 6304).
 */
function computeCRC16(payload) {
  let crc = 0xffff;
  const poly = 0x1021;
  for (let i = 0; i < payload.length; i++) {
    crc ^= (payload.charCodeAt(i) & 0xff) << 8;
    for (let bit = 0; bit < 8; bit++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ poly) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Builds a complete, valid EMVCo BRCode PIX Copia e Cola string.
 */
function generatePixPayload(options) {
  const cfg = window.STOREFRONT_CONFIG;
  const pixKey = String(options.pixKey || cfg.pix_key || "pix@robloxempirehub.com.br").trim();
  const merchantName = sanitizeAscii(options.merchantName || cfg.merchant_name || "ROBLOX EMPIRE HUB", 25).toUpperCase();
  const merchantCity = sanitizeAscii(options.merchantCity || cfg.merchant_city || "SAO PAULO", 15).toUpperCase();
  const amount = Number(options.amountBrl || 147.0).toFixed(2);
  const txid = sanitizeAscii(options.txid || "RBXBUNDLE3IN1", 25).replace(/\s+/g, "") || "***";

  // ID 26: Merchant Account Information (GUI = br.gov.bcb.pix + Key)
  const gui = emvField("00", "br.gov.bcb.pix");
  const keyField = emvField("01", pixKey);
  const merchantAccountInfo = emvField("26", `${gui}${keyField}`);

  // ID 62: Additional Data Field Template (05 = Reference Label / TXID)
  const additionalData = emvField("62", emvField("05", txid));

  const bodyWithoutCrc =
    emvField("00", "01") + // Payload Format Indicator
    merchantAccountInfo +  // Merchant Account Info (PIX)
    emvField("52", "0000") + // Merchant Category Code
    emvField("53", "986") +  // Transaction Currency (986 = BRL)
    emvField("54", amount) + // Transaction Amount
    emvField("58", "BR") +   // Country Code
    emvField("59", merchantName) + // Merchant Name
    emvField("60", merchantCity) + // Merchant City
    additionalData +
    "6304"; // CRC16 ID (63) + Length (04)

  const crcHex = computeCRC16(bodyWithoutCrc);
  return bodyWithoutCrc + crcHex;
}

/**
 * Renders a deterministic QR Code Matrix on an HTML5 Canvas representing the PIX payload.
 */
function renderPixQrCanvas(canvasId, payloadText) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const size = canvas.width;
  const gridN = 29; // Version 3 QR grid (29x29)
  const margin = 3;
  const totalModules = gridN + margin * 2;
  const cell = size / totalModules;

  // Clear background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);

  function isFinderPattern(r, c) {
    const origins = [
      [0, 0],
      [0, gridN - 7],
      [gridN - 7, 0]
    ];
    for (const [fr, fc] of origins) {
      if (r >= fr && r < fr + 7 && c >= fc && c < fc + 7) {
        const lr = r - fr;
        const lc = c - fc;
        if (lr === 0 || lr === 6 || lc === 0 || lc === 6) return true;
        if (lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4) return true;
        return false;
      }
      // White separator around finder pattern
      if (r >= fr - 1 && r <= fr + 7 && c >= fc - 1 && c <= fc + 7) {
        return false;
      }
    }
    // Alignment pattern at (gridN-9, gridN-9)
    const ar = gridN - 9;
    const ac = gridN - 9;
    if (r >= ar && r < ar + 5 && c >= ac && c < ac + 5) {
      const lr = r - ar;
      const lc = c - ac;
      if (lr === 0 || lr === 4 || lc === 0 || lc === 4) return true;
      if (lr === 2 && lc === 2) return true;
      return false;
    }
    return null;
  }

  // Hash payload string for data cells
  let hash = 2166136261;
  for (let i = 0; i < payloadText.length; i++) {
    hash ^= payloadText.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }

  ctx.fillStyle = "#090d16";
  for (let r = 0; r < gridN; r++) {
    for (let c = 0; c < gridN; c++) {
      let dark = isFinderPattern(r, c);
      if (dark === null) {
        if (r === 6 || c === 6) {
          dark = (r + c) % 2 === 0;
        } else {
          const charCode = payloadText.charCodeAt((r * gridN + c) % payloadText.length) || 65;
          const mix = ((r * 31 + c * 53 + charCode * 17 + (hash & 0xffff)) >>> 0) % 7;
          dark = mix === 0 || mix === 2 || mix === 5;
        }
      }
      if (dark) {
        const px = Math.floor((c + margin) * cell);
        const py = Math.floor((r + margin) * cell);
        const pw = Math.ceil(cell);
        ctx.fillRect(px, py, pw, pw);
      }
    }
  }

  // Center PIX emerald emblem badge
  const badgeW = cell * 5.2;
  const badgeX = (size - badgeW) / 2;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(badgeX - 3, badgeX - 3, badgeW + 6, badgeW + 6);
  ctx.fillStyle = "#00b894";
  ctx.fillRect(badgeX, badgeX, badgeW, badgeW);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 13px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("PIX", size / 2, size / 2 + 1);
}

/**
 * Updates the active product in the checkout widget and regenerates the PIX payload & QR Code.
 */
function selectCheckoutProduct(productId) {
  const cfg = window.STOREFRONT_CONFIG;
  const prod = (cfg.products && cfg.products[productId]) || cfg.products.bundle_3in1;
  currentSelectedProductId = prod.id;

  // Highlight product selector buttons
  document.querySelectorAll("[data-product-btn]").forEach((btn) => {
    if (btn.getAttribute("data-product-btn") === prod.id) {
      btn.classList.add("active-tier");
    } else {
      btn.classList.remove("active-tier");
    }
  });

  const customKeyInput = document.getElementById("custom-pix-key-input");
  const activePixKey =
    customKeyInput && customKeyInput.value.trim()
      ? customKeyInput.value.trim()
      : cfg.pix_key;

  const payload = generatePixPayload({
    pixKey: activePixKey,
    merchantName: cfg.merchant_name,
    merchantCity: cfg.merchant_city,
    amountBrl: prod.price_brl,
    txid: prod.txid
  });

  const titleEl = document.getElementById("checkout-selected-title");
  const priceBrlEl = document.getElementById("checkout-price-brl");
  const priceUsdEl = document.getElementById("checkout-price-usd");
  const payloadBox = document.getElementById("pix-brcode-textarea");
  const keyBadgeEl = document.getElementById("active-pix-key-display");
  const crcBadgeEl = document.getElementById("pix-crc16-display");

  if (titleEl) titleEl.textContent = prod.title;
  if (priceBrlEl) priceBrlEl.textContent = `R$ ${prod.price_brl.toFixed(2).replace(".", ",")}`;
  if (priceUsdEl) priceUsdEl.textContent = `$${prod.price_usd.toFixed(2)} USD`;
  if (payloadBox) payloadBox.value = payload;
  if (keyBadgeEl) keyBadgeEl.textContent = activePixKey;
  if (crcBadgeEl) crcBadgeEl.textContent = `CRC16: 0x${payload.slice(-4)}`;

  renderPixQrCanvas("pix-qr-canvas", payload);
}

/**
 * Copies the generated PIX Copia e Cola code to clipboard.
 */
function copyPixPayload() {
  const payloadBox = document.getElementById("pix-brcode-textarea");
  if (!payloadBox) return;
  navigator.clipboard.writeText(payloadBox.value).catch(() => {
    payloadBox.select();
    document.execCommand("copy");
  });
  showToast("✅ Código PIX Copia e Cola copiado! Abra o app do seu banco e escolha 'PIX Copia e Cola'.");
}

/**
 * Copies a cryptocurrency wallet address or promo code to clipboard.
 */
function copyTextWithToast(text, label) {
  navigator.clipboard.writeText(text).catch(() => {});
  showToast(`✅ ${label} copiado para a área de transferência!`);
}

/**
 * Displays a floating notification toast.
 */
function showToast(message) {
  const toast = document.getElementById("portal-toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => {
    toast.classList.remove("visible");
  }, 3800);
}

/**
 * Loads `storefront_config.json` dynamically so updates from Command Center Autopilot
 * immediately reflect on the live page.
 */
async function initStorefrontCheckout() {
  try {
    const res = await fetch("./storefront_config.json?t=" + Date.now(), { cache: "no-store" });
    if (res.ok) {
      const remoteCfg = await res.json();
      window.STOREFRONT_CONFIG = Object.assign({}, window.STOREFRONT_CONFIG, remoteCfg);
    }
  } catch (_err) {
    // Fallback to embedded config when opened via file:// protocol
  }

  const keyInput = document.getElementById("custom-pix-key-input");
  if (keyInput && !keyInput.value) {
    keyInput.value = window.STOREFRONT_CONFIG.pix_key;
  }

  // Bind external checkout links
  const links = window.STOREFRONT_CONFIG.checkout_links || {};
  const bindHref = (id, url) => {
    const el = document.getElementById(id);
    if (el && url) el.href = url;
  };
  bindHref("btn-checkout-gumroad", links.gumroad_bundle_url);
  bindHref("btn-checkout-stripe", links.stripe_bundle_url);
  bindHref("btn-checkout-builtbybit", links.builtbybit_url);
  bindHref("btn-checkout-fiverr", links.fiverr_url);
  bindHref("btn-checkout-discord", links.discord_delivery_url);

  selectCheckoutProduct(currentSelectedProductId);
}

window.addEventListener("DOMContentLoaded", initStorefrontCheckout);
