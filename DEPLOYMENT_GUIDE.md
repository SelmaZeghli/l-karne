<!DOCTYPE html>
<html lang="fr" class="h-full">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>L-Karné — SnackBox dyal l'Bureau v2</title>
  
  <!-- Tailwind CSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            primary: {
              50: '#ecfdf5',
              100: '#d1fae5',
              500: '#10b981',
              600: '#059669',
              700: '#047857',
            },
            amberBrand: '#f59e0b',
          },
          boxShadow: {
            'soft': '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)',
          }
        }
      }
    }
  </script>

  <!-- Lucide Icons -->
  <script src="https://unpkg.com/lucide@latest"></script>
  <!-- Canvas Confetti for celebratory payment settle -->
  <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js"></script>

  <!-- Google Font: Plus Jakarta Sans -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">

  <style>
    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
      -webkit-tap-highlight-color: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 9999px;
    }
    .pulse-tap:active {
      transform: scale(0.96);
    }
  </style>
</head>

<body class="bg-slate-50 text-slate-800 min-h-full flex flex-col antialiased">
  <!-- Toast Alert Container -->
  <div id="toast-container" class="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4"></div>

  <!-- Audio feedback via Web Audio API -->
  <script>
    const playChime = (type = 'success') => {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        if (type === 'success') {
          osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
          osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
          gain.gain.setValueAtTime(0.15, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
          osc.start();
          osc.stop(ctx.currentTime + 0.25);
        } else if (type === 'pay') {
          osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
          osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.1); // E5
          osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.2); // G5
          gain.gain.setValueAtTime(0.18, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
          osc.start();
          osc.stop(ctx.currentTime + 0.35);
        }
      } catch (e) {
        // AudioContext restricted or not supported
      }
    };
  </script>

  <header class="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16 gap-3">
        
        <!-- Logo & Branding -->
        <div class="flex items-center gap-2.5 cursor-pointer" onclick="switchView('store')">
          <div class="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-xl shadow-md shadow-emerald-200">
            🍪
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="font-extrabold text-lg sm:text-xl tracking-tight text-slate-900">L-Karné</span>
              <span class="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Bureau</span>
            </div>
            <p class="text-xs text-slate-500 hidden sm:block">SnackBox & Kridi Tracker en libre-service</p>
          </div>
        </div>

        <!-- Colleague Switcher (Main Header Dropdown) -->
        <div class="flex items-center gap-2 sm:gap-4">
          <div class="flex items-center bg-slate-100 hover:bg-slate-200/80 p-1.5 rounded-xl transition border border-slate-200">
            <span class="text-xs font-medium text-slate-500 pl-2 hidden md:inline">Chkoun nta?</span>
            <div class="relative ml-1">
              <select id="user-select" onchange="changeCurrentUser(this.value)" class="bg-white border border-slate-200 font-semibold text-slate-800 text-xs sm:text-sm rounded-lg py-1 px-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-xs">
                <!-- Injected dynamically -->
              </select>
            </div>
            <button onclick="openModal('add-colleague-modal')" title="Zid Colleague Jdid" class="ml-1 p-1 bg-white hover:bg-emerald-50 text-emerald-700 rounded-lg border border-slate-200 text-xs flex items-center gap-1 font-semibold transition px-2">
              <i data-lucide="user-plus" class="w-3.5 h-3.5"></i>
              <span class="hidden sm:inline">Zid</span>
            </button>
          </div>

          <!-- Quick Tab Balance Pill -->
          <div id="current-user-badge" onclick="switchView('tab')" class="cursor-pointer bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition">
            <i data-lucide="receipt" class="w-4 h-4 text-amber-600"></i>
            <span class="text-xs font-medium hidden xs:inline">Kridi dyali:</span>
            <span id="header-user-debt" class="font-bold text-xs sm:text-sm text-amber-700">0 DH</span>
          </div>

          <!-- Admin Mode Toggle -->
          <button id="admin-toggle-btn" onclick="toggleAdminMode()" class="px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold flex items-center gap-1 transition">
            <i data-lucide="shield-alert" class="w-4 h-4"></i>
            <span class="hidden lg:inline">Admin</span>
          </button>
        </div>

      </div>

      <!-- Navigation Tabs -->
      <nav class="flex space-x-2 sm:space-x-4 border-t border-slate-100 py-2">
        <button id="nav-store" onclick="switchView('store')" class="nav-tab active flex items-center gap-2 py-1.5 px-3 rounded-lg text-xs sm:text-sm font-semibold transition text-emerald-700 bg-emerald-50">
          <i data-lucide="shopping-bag" class="w-4 h-4"></i>
          <span>Snacks & L-ma</span>
        </button>
        <button id="nav-tab" onclick="switchView('tab')" class="nav-tab flex items-center gap-2 py-1.5 px-3 rounded-lg text-xs sm:text-sm font-semibold transition text-slate-600 hover:text-slate-900 hover:bg-slate-100">
          <i data-lucide="book-open" class="w-4 h-4"></i>
          <span>L-Karné (Kridi)</span>
          <span id="unpaid-badge-count" class="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.2 rounded-full">0</span>
        </button>
        <button id="nav-admin" onclick="switchView('admin')" class="nav-tab hidden flex items-center gap-2 py-1.5 px-3 rounded-lg text-xs sm:text-sm font-semibold transition text-slate-600 hover:text-slate-900 hover:bg-slate-100">
          <i data-lucide="boxes" class="w-4 h-4"></i>
          <span>Restock & Gestion</span>
        </button>
      </nav>
    </div>
  </header>

  <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">

    <!-- ==================== VIEW 1: STORE FRONT ==================== -->
    <section id="view-store" class="space-y-6">
      <!-- Colleague Welcome banner -->
      <div class="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-4 sm:p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <span class="text-xl sm:text-2xl font-bold">Marhba, <span id="banner-user-name">Aziz</span> 👋</span>
            <span class="bg-white/20 text-[11px] px-2 py-0.5 rounded-md font-medium">Self-checkout</span>
          </div>
          <p class="text-emerald-100 text-xs sm:text-sm">Khtar snack ola boisson li bghiti, clicki 3la <strong>"Khditha"</strong> w ghadi tzad direct l'kridi dyalk.</p>
        </div>

        <div class="flex items-center gap-3 bg-white/10 backdrop-blur-sm p-3 rounded-xl border border-white/10 self-start md:self-auto">
          <div>
            <div class="text-[11px] uppercase tracking-wider text-emerald-200">Solde Kridi actuel</div>
            <div class="text-xl sm:text-2xl font-black text-white" id="banner-user-total">0.00 DH</div>
          </div>
          <button onclick="openPayModalForCurrent()" class="ml-2 bg-white text-emerald-800 hover:bg-emerald-50 px-3 py-2 rounded-lg text-xs font-bold transition shadow-xs flex items-center gap-1.5">
            <i data-lucide="credit-card" class="w-4 h-4"></i>
            Khllas
          </button>
        </div>
      </div>

      <!-- Category Filter Pills & Search -->
      <div class="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div class="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar" id="category-filters">
          <!-- Filter buttons rendered dynamically -->
        </div>

        <div class="relative w-full sm:w-64">
          <i data-lucide="search" class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
          <input type="text" id="product-search" placeholder="9elleb 3la snack..." oninput="filterProducts()" class="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs">
        </div>
      </div>

      <!-- Product Grid -->
      <div id="product-grid" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 sm:gap-4">
        <!-- Products populated via JS -->
      </div>
      
      <!-- Empty state -->
      <div id="product-empty-state" class="hidden text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
        <div class="text-4xl mb-2">🔍</div>
        <h3 class="font-bold text-slate-700">Walo ma l9inah!</h3>
        <p class="text-xs text-slate-500 mt-1">Jreb 9elleb b smiya khra ola b category khor.</p>
      </div>
    </section>

    <!-- ==================== VIEW 2: L-KARNE (CREDIT LOG) ==================== -->
    <section id="view-tab" class="hidden space-y-6">
      
      <!-- Summary metrics for Kridi -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div class="text-xs text-slate-500 font-semibold">Total Kridi Mazal Makhlas (Bureau)</div>
          <div class="text-2xl font-black text-rose-600 mt-1" id="kridi-total-debt">0.00 DH</div>
          <div class="text-[11px] text-slate-400 mt-1">Total li 3la l'collègues kamlin</div>
        </div>
        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div class="text-xs text-slate-500 font-semibold">Kridi dyal: <span id="kridi-selected-colleague-name">User</span></div>
          <div class="text-2xl font-black text-amber-600 mt-1" id="kridi-user-balance">0.00 DH</div>
          <div class="text-[11px] text-slate-400 mt-1">Solde khass ykhllso</div>
        </div>
        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div class="text-xs text-slate-500 font-semibold">Khllas Sre3 (Quick Settle)</div>
            <div class="text-xs text-slate-600 mt-1">Safi khllasti l'moul snack f'khatra?</div>
          </div>
          <button onclick="openPayModalForCurrent()" class="mt-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-xs">
            <i data-lucide="check-circle-2" class="w-4 h-4"></i>
            Rejje3 Kridi (Régler)
          </button>
        </div>
      </div>

      <!-- Colleague Debts Leaderboard Cards -->
      <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <i data-lucide="users" class="w-5 h-5 text-emerald-600"></i>
            <h2 class="font-bold text-slate-800 text-base">État des Soldes dyal l'Bureau</h2>
          </div>
          <span class="text-xs text-slate-400">Cliquez 3la smiya bach tchouf kridi dyalo</span>
        </div>
        <div id="colleagues-balance-grid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <!-- Injected via JS -->
        </div>
      </div>

      <!-- Transaction Filters -->
      <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <h3 class="font-bold text-slate-800 text-sm">Historique des Snacks & Paiements</h3>
            <span id="filtered-count-badge" class="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded-full font-medium">0 opérations</span>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <select id="log-filter-colleague" onchange="renderTransactions()" class="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg p-2 font-medium focus:ring-2 focus:ring-emerald-500">
              <option value="ALL">Ga3 l'Collègues</option>
            </select>

            <select id="log-filter-status" onchange="renderTransactions()" class="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg p-2 font-medium focus:ring-2 focus:ring-emerald-500">
              <option value="ALL">Ga3 l'États</option>
              <option value="UNPAID" selected>Kridi Mazal (Non payé)</option>
              <option value="PAID">Khalles (Payé)</option>
            </select>
          </div>
        </div>

        <!-- Transactions Table / List -->
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr class="border-b border-slate-100 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                <th class="pb-2">Waqt</th>
                <th class="pb-2">Colleague</th>
                <th class="pb-2">Article / Détail</th>
                <th class="pb-2">Montant</th>
                <th class="pb-2">Statut</th>
                <th class="pb-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody id="transactions-tbody" class="divide-y divide-slate-100 text-slate-700">
              <!-- Dynamically populated -->
            </tbody>
          </table>
        </div>

        <div id="tx-empty-state" class="hidden text-center py-8 text-slate-400 text-xs">
          Walo f had l'filtre! Kolchi n9i.
        </div>
      </div>

    </section>

    <!-- ==================== VIEW 3: ADMIN & RESTOCK ==================== -->
    <section id="view-admin" class="hidden space-y-6">
      
      <!-- Top Overview Stats -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div class="text-xs text-slate-500 font-semibold">Kridi Ba9i F'Zan9a</div>
          <div class="text-2xl font-black text-rose-600 mt-1" id="admin-total-unpaid">0.00 DH</div>
          <div class="text-[11px] text-slate-400">Total non réglé</div>
        </div>
        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div class="text-xs text-slate-500 font-semibold">Total Khlassat Recueillis</div>
          <div class="text-2xl font-black text-emerald-600 mt-1" id="admin-total-settled">0.00 DH</div>
          <div class="text-[11px] text-slate-400">Kridi li rje3</div>
        </div>
        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div class="text-xs text-slate-500 font-semibold">Valeur Stock Actuel</div>
          <div class="text-2xl font-black text-blue-600 mt-1" id="admin-inventory-value">0.00 DH</div>
          <div class="text-[11px] text-slate-400">Sur la base du prix de vente</div>
        </div>
        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div class="text-xs text-slate-500 font-semibold">Articles en Rupture / Faible</div>
          <div class="text-2xl font-black text-amber-500 mt-1" id="admin-low-stock-count">0</div>
          <div class="text-[11px] text-slate-400">&le; 2 pièces restantes</div>
        </div>
      </div>

      <!-- Quick Actions Bar & Restock Inventory -->
      <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 class="font-bold text-slate-800 text-base">Gestion de Stock & Restock Sre3</h2>
            <p class="text-xs text-slate-500">Zid f l'quantité dial l'sel3a li jbti men Marjane / Bim / L'hanout</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <button onclick="openModal('add-product-modal')" class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition">
              <i data-lucide="plus" class="w-4 h-4"></i>
              Zid Produit Jdid
            </button>
            <button onclick="exportDataJSON()" class="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5 transition" title="Sauvegarder JSON">
              <i data-lucide="download" class="w-4 h-4"></i>
              Export Backup
            </button>
            <label class="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5 transition" title="Restaurer JSON">
              <i data-lucide="upload" class="w-4 h-4"></i>
              Import
              <input type="file" id="import-json-file" accept=".json" onchange="importDataJSON(event)" class="hidden">
            </label>
          </div>
        </div>

        <!-- Inventory Restock Table -->
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr class="border-b border-slate-100 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                <th class="pb-2">Produit</th>
                <th class="pb-2">Catégorie</th>
                <th class="pb-2">Prix</th>
                <th class="pb-2">Stock Actuel</th>
                <th class="pb-2">Quick Restock</th>
                <th class="pb-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody id="inventory-tbody" class="divide-y divide-slate-100">
              <!-- Rendered dynamically -->
            </tbody>
          </table>
        </div>
      </div>

      <!-- Backup & GitHub Pages note -->
      <div class="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-900 text-xs flex items-start gap-3">
        <i data-lucide="info" class="w-5 h-5 text-amber-600 shrink-0 mt-0.5"></i>
        <div>
          <strong class="font-bold">Astuce GitHub Pages & Stockage :</strong>
          Had l'app khedama 100% f navigateur dialk w les données kaytstokaw f <code>localStorage</code>.
          Bach ma di3ch les données ila chngiti l'navigateur ola f tilifoun akhor, khtar <strong>Export Backup (JSON)</strong> mra mra, ola exporti CSV bach tpartagih m3a l'equipe f Slack / Teams / WhatsApp!
          <div class="mt-2">
            <button onclick="exportTransactionsCSV()" class="font-semibold underline text-amber-800 hover:text-amber-950 inline-flex items-center gap-1">
              <i data-lucide="file-spreadsheet" class="w-3.5 h-3.5"></i> Télécarger l'historique complet f CSV (Excel)
            </button>
          </div>
        </div>
      </div>

    </section>

  </main>

  <!-- MODAL: Settlement / Payment Confirmation -->
  <div id="payment-modal" class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 hidden">
    <div class="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-150">
      <div class="p-6">
        <div class="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
          <i data-lucide="badge-check" class="w-6 h-6"></i>
        </div>
        <h3 class="text-lg font-bold text-slate-900">Réglement dyal l'Kridi</h3>
        <p class="text-xs text-slate-500 mt-1">Khllasti l'moul store en espèces / Virement / Wafacash?</p>

        <div class="mt-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div class="flex justify-between text-xs text-slate-500">
            <span>Colleague:</span>
            <span class="font-bold text-slate-800" id="pay-modal-colleague-name">-</span>
          </div>
          <div class="flex justify-between text-sm mt-1">
            <span class="font-semibold text-slate-700">Total Kridi dû:</span>
            <span class="font-extrabold text-rose-600 text-base" id="pay-modal-debt-amount">0.00 DH</span>
          </div>
        </div>

        <div class="mt-4 space-y-2">
          <label class="text-xs font-semibold text-slate-600 block">Chhal bghiti tkhllas db?</label>
          <div class="relative">
            <input type="number" id="pay-amount-input" step="0.5" class="w-full pl-3 pr-12 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none" placeholder="0">
            <span class="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-xs text-slate-400">DH</span>
          </div>
          <div class="flex gap-2 pt-1">
            <button onclick="setPayFullAmount()" class="text-[11px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-lg">
              Kolchi (Total)
            </button>
            <button onclick="setPayQuickAmount(10)" class="text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded-lg">10 DH</button>
            <button onclick="setPayQuickAmount(20)" class="text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded-lg">20 DH</button>
            <button onclick="setPayQuickAmount(50)" class="text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded-lg">50 DH</button>
          </div>
        </div>

        <div class="mt-4">
          <label class="text-xs font-semibold text-slate-600 block mb-1">Moyen de paiement / Note</label>
          <input type="text" id="pay-note-input" placeholder="Ex: Espèces f l'boite, Cash Plus..." class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none">
        </div>

        <div class="mt-6 flex gap-3">
          <button onclick="closeModal('payment-modal')" class="flex-1 py-2.5 border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs transition">
            Annuler
          </button>
          <button onclick="confirmPayment()" class="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1">
            <i data-lucide="check" class="w-4 h-4"></i>
            Valider Khllas
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- MODAL: Add New Colleague -->
  <div id="add-colleague-modal" class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 hidden">
    <div class="bg-white w-full max-w-sm rounded-2xl shadow-xl overflow-hidden p-6 animate-in fade-in duration-150">
      <h3 class="text-base font-bold text-slate-900 flex items-center gap-2">
        <i data-lucide="user-plus" class="w-5 h-5 text-emerald-600"></i>
        Zid Colleague Jdid
      </h3>
      <p class="text-xs text-slate-500 mt-1">Dkhel smiya dial l'collègue li khedam m3ana f l'bureau.</p>

      <form onsubmit="handleAddColleague(event)" class="mt-4 space-y-4">
        <div>
          <label class="text-xs font-semibold text-slate-700 block mb-1">Smiya (Prénom / Surnom) *</label>
          <input type="text" id="new-colleague-name" required placeholder="Ex: Mehdi, Yassine, Fatima..." class="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
        </div>

        <div>
          <label class="text-xs font-semibold text-slate-700 block mb-1">Avatar Emoji</label>
          <div class="flex gap-2 items-center">
            <input type="text" id="new-colleague-avatar" value="👤" maxlength="2" class="w-12 text-center text-xl py-1.5 border border-slate-200 rounded-xl">
            <div class="flex gap-1">
              <button type="button" onclick="setAvatarEmoji('👨‍💻')" class="p-1.5 bg-slate-100 rounded-lg hover:bg-slate-200">👨‍💻</button>
              <button type="button" onclick="setAvatarEmoji('👩‍💻')" class="p-1.5 bg-slate-100 rounded-lg hover:bg-slate-200">👩‍💻</button>
              <button type="button" onclick="setAvatarEmoji('⚡')" class="p-1.5 bg-slate-100 rounded-lg hover:bg-slate-200">⚡</button>
              <button type="button" onclick="setAvatarEmoji('☕')" class="p-1.5 bg-slate-100 rounded-lg hover:bg-slate-200">☕</button>
            </div>
          </div>
        </div>

        <div class="flex gap-3 pt-2">
          <button type="button" onclick="closeModal('add-colleague-modal')" class="flex-1 py-2 border border-slate-200 text-slate-600 font-semibold rounded-xl text-xs">
            Annuler
          </button>
          <button type="submit" class="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs">
            Zid Colleague
          </button>
        </div>
      </form>
    </div>
  </div>

  <!-- MODAL: Add New Product -->
  <div id="add-product-modal" class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 hidden">
    <div class="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden p-6 animate-in fade-in duration-150">
      <h3 class="text-base font-bold text-slate-900 flex items-center gap-2">
        <i data-lucide="package-plus" class="w-5 h-5 text-emerald-600"></i>
        Zid Produit Jdid l'Stock
      </h3>
      <p class="text-xs text-slate-500 mt-1">Dkhel les détails dyal snack li jbti l'magasin.</p>

      <form onsubmit="handleAddProduct(event)" class="mt-4 space-y-3">
        <div class="grid grid-cols-3 gap-2">
          <div class="col-span-2">
            <label class="text-xs font-semibold text-slate-700 block mb-1">Smiya dial l'article *</label>
            <input type="text" id="new-prod-name" required placeholder="Ex: Hawai Canette, Raibi..." class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500">
          </div>
          <div>
            <label class="text-xs font-semibold text-slate-700 block mb-1">Emoji</label>
            <input type="text" id="new-prod-emoji" value="🍫" maxlength="3" class="w-full text-center text-lg py-1.5 border border-slate-200 rounded-xl">
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="text-xs font-semibold text-slate-700 block mb-1">Catégorie *</label>
            <select id="new-prod-category" class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500">
              <option value="Boissons">Boissons / L-ma</option>
              <option value="Biscuits">Biscuits / Chocolat</option>
              <option value="Snacks">Snacks / Chips</option>
              <option value="Café">Café / Thé</option>
              <option value="Autre">Autre</option>
            </select>
          </div>
          <div>
            <label class="text-xs font-semibold text-slate-700 block mb-1">Prix Vente (DH) *</label>
            <input type="number" id="new-prod-price" step="0.5" min="0.5" required placeholder="3.0" class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500">
          </div>
        </div>

        <div>
          <label class="text-xs font-semibold text-slate-700 block mb-1">Stock Initial (Nombre de pièces)</label>
          <input type="number" id="new-prod-stock" min="1" value="12" class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500">
        </div>

        <div class="flex gap-3 pt-3">
          <button type="button" onclick="closeModal('add-product-modal')" class="flex-1 py-2 border border-slate-200 text-slate-600 font-semibold rounded-xl text-xs">
            Annuler
          </button>
          <button type="submit" class="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs">
            Enregistrer Produit
          </button>
        </div>
      </form>
    </div>
  </div>

  <footer class="mt-auto border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
    <div class="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
      <div class="flex items-center gap-1.5">
        <span class="font-bold text-slate-700">L-Karné dyal l'Bureau</span> — 100% Client-side GitHub Pages App.
      </div>
      <div class="text-slate-400">
        SnackBox collaborative &bull; Settle debts with trust 🤝
      </div>
    </div>
  </footer>

  <script>
    // Storage Keys
    const STORAGE_KEY_USERS = 'lkarne_users_v1';
    const STORAGE_KEY_PRODUCTS = 'lkarne_products_v1';
    const STORAGE_KEY_TRANSACTIONS = 'lkarne_transactions_v1';
    const STORAGE_KEY_CURRENT_USER = 'lkarne_current_user_v1';
    const STORAGE_KEY_ADMIN_STATE = 'lkarne_admin_active_v1';

    // Seed Data with realistic Moroccan office snacks
    const DEFAULT_USERS = [
      { id: 'u1', name: 'Aziz', avatar: '👨‍💻' },
      { id: 'u2', name: 'Omar', avatar: '⚡' },
      { id: 'u3', name: 'Salma', avatar: '👩‍💻' },
      { id: 'u4', name: 'Mehdi', avatar: '☕' },
      { id: 'u5', name: 'Ghita', avatar: '🎨' },
    ];

    const DEFAULT_PRODUCTS = [
      { id: 'p1', name: 'Eau Sidi Ali (50cl)', category: 'Boissons', price: 3.5, stock: 18, emoji: '💧' },
      { id: 'p2', name: 'Eau Ain Saiss (50cl)', category: 'Boissons', price: 3.5, stock: 14, emoji: '💧' },
      { id: 'p3', name: 'Coca-Cola Canette (33cl)', category: 'Boissons', price: 6.0, stock: 10, emoji: '🥤' },
      { id: 'p4', name: 'Poms Canette (33cl)', category: 'Boissons', price: 5.5, stock: 8, emoji: '🍏' },
      { id: 'p5', name: 'Hawai Tropical (33cl)', category: 'Boissons', price: 5.5, stock: 6, emoji: '🍍' },
      { id: 'p6', name: 'Merendina Original', category: 'Biscuits', price: 2.5, stock: 15, emoji: '🍫' },
      { id: 'p7', name: 'Bimo Golden', category: 'Biscuits', price: 2.0, stock: 12, emoji: '🍪' },
      { id: 'p8', name: 'KitKat 4 Fingers', category: 'Biscuits', price: 6.5, stock: 7, emoji: '🍫' },
      { id: 'p9', name: 'Chips Lay\'s Fromage', category: 'Snacks', price: 4.0, stock: 8, emoji: '🥔' },
      { id: 'p10', name: 'Chips Lay\'s Sel', category: 'Snacks', price: 4.0, stock: 5, emoji: '🍟' },
      { id: 'p11', name: 'Capsule Café Nespresso', category: 'Café', price: 4.5, stock: 24, emoji: '☕' },
      { id: 'p12', name: 'Nescafé 3en1 Stick', category: 'Café', price: 2.5, stock: 16, emoji: '☕' },
    ];

    // State
    let users = [];
    let products = [];
    let transactions = [];
    let currentUserId = null;
    let currentCategoryFilter = 'ALL';
    let isAdmin = false;

    function initData() {
      try {
        const storedUsers = localStorage.getItem(STORAGE_KEY_USERS);
        users = storedUsers ? JSON.parse(storedUsers) : [...DEFAULT_USERS];

        const storedProducts = localStorage.getItem(STORAGE_KEY_PRODUCTS);
        products = storedProducts ? JSON.parse(storedProducts) : [...DEFAULT_PRODUCTS];

        const storedTxs = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
        transactions = storedTxs ? JSON.parse(storedTxs) : [];

        // Current active user
        const storedCurUser = localStorage.getItem(STORAGE_KEY_CURRENT_USER);
        if (storedCurUser && users.some(u => u.id === storedCurUser)) {
          currentUserId = storedCurUser;
        } else {
          currentUserId = users[0]?.id || null;
        }

        // Admin mode preference
        isAdmin = localStorage.getItem(STORAGE_KEY_ADMIN_STATE) === 'true';

        // Save initial seeds if empty
        persistAll();
      } catch (e) {
        console.error('Error loading localStorage:', e);
        users = [...DEFAULT_USERS];
        products = [...DEFAULT_PRODUCTS];
        transactions = [];
        currentUserId = users[0].id;
      }
    }

    function persistAll() {
      try {
        localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
        localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(products));
        localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(transactions));
        if (currentUserId) localStorage.setItem(STORAGE_KEY_CURRENT_USER, currentUserId);
        localStorage.setItem(STORAGE_KEY_ADMIN_STATE, isAdmin.toString());
      } catch (e) {
        showToast('Erreur sauvegarde storage!', 'error');
      }
    }

    function getUserDebt(userId) {
      return transactions
        .filter(t => t.userId === userId && !t.paid)
        .reduce((sum, t) => sum + (t.amount || 0), 0);
    }

    function getTotalOfficeDebt() {
      return transactions
        .filter(t => !t.paid)
        .reduce((sum, t) => sum + (t.amount || 0), 0);
    }

    function getTotalSettled() {
      return transactions
        .filter(t => t.paid && t.type === 'ITEM')
        .reduce((sum, t) => sum + (t.amount || 0), 0);
    }

    function getCurrentUser() {
      return users.find(u => u.id === currentUserId) || users[0];
    }

    function renderUserSelect() {
      const select = document.getElementById('user-select');
      if (!select) return;
      select.innerHTML = users.map(u => `
        <option value="${u.id}" ${u.id === currentUserId ? 'selected' : ''}>
          ${u.avatar} ${u.name}
        </option>
      `).join('');

      // Also update log colleague filter select
      const logColleagueSelect = document.getElementById('log-filter-colleague');
      if (logColleagueSelect) {
        const curVal = logColleagueSelect.value;
        logColleagueSelect.innerHTML = `
          <option value="ALL">Ga3 l'Collègues (${users.length})</option>
          ${users.map(u => `<option value="${u.id}">${u.avatar} ${u.name}</option>`).join('')}
        `;
        logColleagueSelect.value = curVal || 'ALL';
      }

      updateUserBanner();
    }

    function updateUserBanner() {
      const cur = getCurrentUser();
      if (!cur) return;

      const debt = getUserDebt(cur.id);
      document.getElementById('banner-user-name').textContent = cur.name;
      document.getElementById('banner-user-total').textContent = `${debt.toFixed(2)} DH`;
      document.getElementById('header-user-debt').textContent = `${debt.toFixed(2)} DH`;
      document.getElementById('kridi-selected-colleague-name').textContent = cur.name;
      document.getElementById('kridi-user-balance').textContent = `${debt.toFixed(2)} DH`;
      document.getElementById('kridi-total-debt').textContent = `${getTotalOfficeDebt().toFixed(2)} DH`;

      // Update unpaid count badge
      const unpaidCount = transactions.filter(t => !t.paid).length;
      document.getElementById('unpaid-badge-count').textContent = unpaidCount;
    }

    function changeCurrentUser(newId) {
      currentUserId = newId;
      localStorage.setItem(STORAGE_KEY_CURRENT_USER, newId);
      updateUserBanner();
      renderColleaguesBalances();
      renderTransactions();
      showToast(`Changement de profil : ${getCurrentUser()?.name}`);
    }

    function renderCategoryPills() {
      const container = document.getElementById('category-filters');
      if (!container) return;

      const categories = ['ALL', ...new Set(products.map(p => p.category))];
      
      container.innerHTML = categories.map(cat => {
        const isActive = currentCategoryFilter === cat;
        const label = cat === 'ALL' ? 'Kolchi' : cat;
        return `
          <button onclick="setCategoryFilter('${cat}')" class="whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-bold transition ${
            isActive 
              ? 'bg-slate-900 text-white shadow-xs' 
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
          }">
            ${label}
          </button>
        `;
      }).join('');
    }

    function setCategoryFilter(cat) {
      currentCategoryFilter = cat;
      renderCategoryPills();
      filterProducts();
    }

    function filterProducts() {
      const search = (document.getElementById('product-search')?.value || '').toLowerCase().trim();
      const grid = document.getElementById('product-grid');
      const emptyState = document.getElementById('product-empty-state');
      if (!grid) return;

      const filtered = products.filter(p => {
        const matchesCat = currentCategoryFilter === 'ALL' || p.category === currentCategoryFilter;
        const matchesSearch = p.name.toLowerCase().includes(search) || p.category.toLowerCase().includes(search);
        return matchesCat && matchesSearch;
      });

      if (filtered.length === 0) {
        grid.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
      }

      emptyState.classList.add('hidden');
      grid.innerHTML = filtered.map(p => {
        const isOutOfStock = p.stock <= 0;
        const isLowStock = p.stock > 0 && p.stock <= 2;
        
        return `
          <div class="bg-white rounded-2xl p-4 border ${isOutOfStock ? 'border-dashed border-slate-300 opacity-60' : 'border-slate-200'} shadow-soft flex flex-col justify-between transition-all hover:shadow-md hover:-translate-y-0.5 relative group">
            
            ${isLowStock ? `
              <span class="absolute top-2.5 right-2.5 bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1">
                B9a ${p.stock}
              </span>
            ` : ''}

            ${isOutOfStock ? `
              <span class="absolute top-2.5 right-2.5 bg-rose-100 text-rose-800 text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                Tssala
              </span>
            ` : ''}

            <div>
              <div class="text-3xl sm:text-4xl text-center py-2 filter drop-shadow-xs select-none">
                ${p.emoji || '🍪'}
              </div>
              <div class="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">${p.category}</div>
              <h3 class="font-bold text-slate-800 text-xs sm:text-sm leading-tight line-clamp-2">${p.name}</h3>
            </div>

            <div class="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-2">
              <div class="flex items-baseline justify-between">
                <span class="text-base sm:text-lg font-black text-emerald-600">${p.price.toFixed(2)} <span class="text-[11px] font-bold text-slate-400">DH</span></span>
                <span class="text-[11px] font-semibold text-slate-500">Stock: <strong>${p.stock}</strong></span>
              </div>

              <button 
                onclick="grabProduct('${p.id}')"
                ${isOutOfStock ? 'disabled' : ''}
                class="w-full py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 pulse-tap ${
                  isOutOfStock
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs shadow-emerald-200'
                }">
                <i data-lucide="plus-circle" class="w-3.5 h-3.5"></i>
                <span>${isOutOfStock ? 'Rupture' : 'Khditha (+1)'}</span>
              </button>
            </div>

          </div>
        `;
      }).join('');

      lucide.createIcons();
    }

    function grabProduct(productId) {
      const prod = products.find(p => p.id === productId);
      const user = getCurrentUser();

      if (!prod || !user) return;
      if (prod.stock <= 0) {
        showToast('Had l\'produit tssala! Khass restock.', 'error');
        return;
      }

      // Decrement stock
      prod.stock -= 1;

      // Add credit transaction
      const newTx = {
        id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        type: 'ITEM',
        userId: user.id,
        userName: user.name,
        userAvatar: user.avatar,
        productId: prod.id,
        productName: prod.name,
        productEmoji: prod.emoji,
        amount: prod.price,
        timestamp: new Date().toISOString(),
        paid: false,
        settledAt: null,
      };

      transactions.unshift(newTx);
      persistAll();
      playChime('success');

      showToast(`Bsseha! ${prod.name} tzad f'kridi dyal ${user.name} (+${prod.price.toFixed(2)} DH)`);

      // Refresh UI
      filterProducts();
      updateUserBanner();
      renderColleaguesBalances();
      renderTransactions();
      renderAdminInventory();
    }

    function renderColleaguesBalances() {
      const grid = document.getElementById('colleagues-balance-grid');
      if (!grid) return;

      grid.innerHTML = users.map(u => {
        const debt = getUserDebt(u.id);
        const isCurrent = u.id === currentUserId;
        return `
          <div onclick="changeCurrentUser('${u.id}')" class="cursor-pointer p-3 rounded-xl border ${isCurrent ? 'border-emerald-500 bg-emerald-50/50 shadow-xs ring-1 ring-emerald-400' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'} transition flex flex-col justify-between">
            <div class="flex items-center gap-2">
              <span class="text-xl">${u.avatar}</span>
              <span class="font-bold text-xs text-slate-800 truncate">${u.name}</span>
            </div>
            <div class="mt-2 text-right">
              <span class="text-xs font-black ${debt > 0 ? 'text-rose-600' : 'text-slate-400'}">${debt.toFixed(2)} DH</span>
            </div>
          </div>
        `;
      }).join('');
    }

    function renderTransactions() {
      const tbody = document.getElementById('transactions-tbody');
      const emptyState = document.getElementById('tx-empty-state');
      const filterColleague = document.getElementById('log-filter-colleague')?.value || 'ALL';
      const filterStatus = document.getElementById('log-filter-status')?.value || 'ALL';
      if (!tbody) return;

      const filtered = transactions.filter(t => {
        const matchColleague = filterColleague === 'ALL' || t.userId === filterColleague;
        const matchStatus = filterStatus === 'ALL' 
          ? true 
          : filterStatus === 'UNPAID' ? !t.paid : t.paid;
        return matchColleague && matchStatus;
      });

      document.getElementById('filtered-count-badge').textContent = `${filtered.length} opérations`;

      if (filtered.length === 0) {
        tbody.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
      }

      emptyState.classList.add('hidden');
      tbody.innerHTML = filtered.map(t => {
        const dateObj = new Date(t.timestamp);
        const dateStr = dateObj.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
        const timeStr = dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

        return `
          <tr class="hover:bg-slate-50 transition">
            <td class="py-2.5 text-slate-500">
              <div class="font-semibold text-slate-700">${dateStr}</div>
              <div class="text-[10px] text-slate-400">${timeStr}</div>
            </td>
            <td class="py-2.5 font-bold text-slate-800">
              <span class="inline-flex items-center gap-1.5">
                <span>${t.userAvatar || '👤'}</span>
                <span>${t.userName}</span>
              </span>
            </td>
            <td class="py-2.5">
              ${t.type === 'PAYMENT' ? `
                <span class="inline-flex items-center gap-1 font-semibold text-emerald-700">
                  <i data-lucide="check-circle" class="w-3.5 h-3.5"></i>
                  Réglement / Khllas (${t.note || 'Cash'})
                </span>
              ` : `
                <span class="inline-flex items-center gap-1 font-medium text-slate-700">
                  <span>${t.productEmoji || '🍪'}</span>
                  <span>${t.productName}</span>
                </span>
              `}
            </td>
            <td class="py-2.5 font-bold ${t.type === 'PAYMENT' ? 'text-emerald-600' : 'text-slate-900'}">
              ${t.type === 'PAYMENT' ? '-' : ''}${t.amount.toFixed(2)} DH
            </td>
            <td class="py-2.5">
              ${t.paid ? `
                <span class="bg-emerald-100 text-emerald-800 font-bold text-[10px] px-2 py-0.5 rounded-full inline-flex items-center gap-0.5">
                  <i data-lucide="check" class="w-3 h-3"></i> Payé
                </span>
              ` : `
                <span class="bg-rose-100 text-rose-800 font-bold text-[10px] px-2 py-0.5 rounded-full inline-flex items-center gap-0.5">
                  <i data-lucide="clock" class="w-3 h-3"></i> Kridi
                </span>
              `}
            </td>
            <td class="py-2.5 text-right">
              ${!t.paid ? `
                <button onclick="markSingleTxPaid('${t.id}')" class="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-lg transition border border-emerald-200">
                  Khlles
                </button>
              ` : `
                <button onclick="revertSingleTxToUnpaid('${t.id}')" title="Annuler le paiement" class="text-[11px] text-slate-400 hover:text-slate-600 p-1">
                  <i data-lucide="undo-2" class="w-3.5 h-3.5"></i>
                </button>
              `}
            </td>
          </tr>
        `;
      }).join('');

      lucide.createIcons();
    }

    function openPayModalForCurrent() {
      const cur = getCurrentUser();
      const debt = getUserDebt(cur.id);

      if (debt <= 0) {
        showToast(`${cur.name} ma 3endouch kridi ba9i! Kolchi khalles. 🎉`, 'info');
        return;
      }

      document.getElementById('pay-modal-colleague-name').textContent = `${cur.avatar} ${cur.name}`;
      document.getElementById('pay-modal-debt-amount').textContent = `${debt.toFixed(2)} DH`;
      document.getElementById('pay-amount-input').value = debt.toFixed(2);
      document.getElementById('pay-note-input').value = 'Espèces f l\'boite';
      openModal('payment-modal');
    }

    function setPayFullAmount() {
      const cur = getCurrentUser();
      const debt = getUserDebt(cur.id);
      document.getElementById('pay-amount-input').value = debt.toFixed(2);
    }

    function setPayQuickAmount(val) {
      document.getElementById('pay-amount-input').value = val.toFixed(2);
    }

    function confirmPayment() {
      const cur = getCurrentUser();
      const payAmount = parseFloat(document.getElementById('pay-amount-input').value);
      const note = document.getElementById('pay-note-input').value.trim() || 'Réglement direct';

      if (isNaN(payAmount) || payAmount <= 0) {
        showToast('Dkhel montant s7i7 3afak!', 'error');
        return;
      }

      // Settle oldest unpaid items first up to amount
      let remainingToSettle = payAmount;
      const unpaidItems = transactions
        .filter(t => t.userId === cur.id && !t.paid && t.type === 'ITEM')
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      for (const item of unpaidItems) {
        if (remainingToSettle >= item.amount) {
          item.paid = true;
          item.settledAt = new Date().toISOString();
          remainingToSettle -= item.amount;
        } else {
          // If partial remainder, create an adjustment or mark as paid
          break;
        }
      }

      // Add a settlement ledger entry
      const settlementTx = {
        id: 'tx_pay_' + Date.now(),
        type: 'PAYMENT',
        userId: cur.id,
        userName: cur.name,
        userAvatar: cur.avatar,
        amount: payAmount,
        note: note,
        timestamp: new Date().toISOString(),
        paid: true,
      };

      transactions.unshift(settlementTx);
      persistAll();
      closeModal('payment-modal');

      playChime('pay');
      try {
        confetti({
          particleCount: 60,
          spread: 60,
          origin: { y: 0.7 }
        });
      } catch (e) {}

      showToast(`Allah ykhellik! Khllas dyal ${payAmount.toFixed(2)} DH t'validat.`);
      updateUserBanner();
      renderColleaguesBalances();
      renderTransactions();
      renderAdminInventory();
    }

    function markSingleTxPaid(txId) {
      const tx = transactions.find(t => t.id === txId);
      if (!tx) return;
      tx.paid = true;
      tx.settledAt = new Date().toISOString();
      persistAll();
      playChime('pay');
      showToast(`Article makhlas!`);
      updateUserBanner();
      renderColleaguesBalances();
      renderTransactions();
      renderAdminInventory();
    }

    function revertSingleTxToUnpaid(txId) {
      const tx = transactions.find(t => t.id === txId);
      if (!tx) return;
      tx.paid = false;
      tx.settledAt = null;
      persistAll();
      showToast(`Paiement annulé, rje3 l'kridi.`);
      updateUserBanner();
      renderColleaguesBalances();
      renderTransactions();
      renderAdminInventory();
    }

    function toggleAdminMode() {
      isAdmin = !isAdmin;
      localStorage.setItem(STORAGE_KEY_ADMIN_STATE, isAdmin.toString());
      applyAdminState();
      if (isAdmin) {
        showToast('Mode Admin activé: Zid sel3a w géri l\'stock');
        switchView('admin');
      } else {
        showToast('Mode Admin désactivé');
        switchView('store');
      }
    }

    function applyAdminState() {
      const adminNav = document.getElementById('nav-admin');
      const adminBtn = document.getElementById('admin-toggle-btn');
      
      if (isAdmin) {
        adminNav.classList.remove('hidden');
        adminBtn.classList.add('bg-emerald-100', 'text-emerald-800', 'border-emerald-300');
      } else {
        adminNav.classList.add('hidden');
        adminBtn.classList.remove('bg-emerald-100', 'text-emerald-800', 'border-emerald-300');
      }
      renderAdminInventory();
    }

    function renderAdminInventory() {
      // Calculate dashboard metrics
      const unpaid = getTotalOfficeDebt();
      const settled = getTotalSettled();
      const invValue = products.reduce((sum, p) => sum + (p.stock * p.price), 0);
      const lowStockCount = products.filter(p => p.stock <= 2).length;

      document.getElementById('admin-total-unpaid').textContent = `${unpaid.toFixed(2)} DH`;
      document.getElementById('admin-total-settled').textContent = `${settled.toFixed(2)} DH`;
      document.getElementById('admin-inventory-value').textContent = `${invValue.toFixed(2)} DH`;
      document.getElementById('admin-low-stock-count').textContent = lowStockCount;

      // Table
      const tbody = document.getElementById('inventory-tbody');
      if (!tbody) return;

      tbody.innerHTML = products.map(p => {
        return `
          <tr class="hover:bg-slate-50">
            <td class="py-2.5 font-bold text-slate-800">
              <span class="text-base mr-1">${p.emoji || '📦'}</span>
              ${p.name}
            </td>
            <td class="py-2.5 text-xs text-slate-500">${p.category}</td>
            <td class="py-2.5 font-semibold text-slate-800">${p.price.toFixed(2)} DH</td>
            <td class="py-2.5">
              <span class="font-extrabold ${p.stock <= 2 ? 'text-rose-600' : 'text-slate-800'} text-xs bg-slate-100 px-2 py-0.5 rounded-md">
                ${p.stock} unités
              </span>
            </td>
            <td class="py-2.5">
              <div class="flex items-center gap-1">
                <button onclick="restockProduct('${p.id}', 1)" class="px-2 py-0.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 font-bold text-xs rounded border border-slate-200">+1</button>
                <button onclick="restockProduct('${p.id}', 5)" class="px-2 py-0.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 font-bold text-xs rounded border border-slate-200">+5</button>
                <button onclick="restockProduct('${p.id}', 10)" class="px-2 py-0.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 font-bold text-xs rounded border border-slate-200">+10</button>
              </div>
            </td>
            <td class="py-2.5 text-right">
              <button onclick="deleteProduct('${p.id}')" title="Supprimer produit" class="text-slate-400 hover:text-rose-600 p-1">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            </td>
          </tr>
        `;
      }).join('');

      lucide.createIcons();
    }

    function restockProduct(productId, count) {
      const prod = products.find(p => p.id === productId);
      if (!prod) return;
      prod.stock += count;
      persistAll();
      filterProducts();
      renderAdminInventory();
      showToast(`+${count} tzad f'stock dyal ${prod.name}`);
    }

    function deleteProduct(productId) {
      const prod = products.find(p => p.id === productId);
      if (!prod) return;
      products = products.filter(p => p.id !== productId);
      persistAll();
      filterProducts();
      renderCategoryPills();
      renderAdminInventory();
      showToast(`Produit ${prod.name} t'msse7.`);
    }

    function handleAddColleague(e) {
      e.preventDefault();
      const nameInput = document.getElementById('new-colleague-name');
      const avatarInput = document.getElementById('new-colleague-avatar');
      
      const name = nameInput.value.trim();
      const avatar = avatarInput.value.trim() || '👤';

      if (!name) return;

      const newUser = {
        id: 'u_' + Date.now(),
        name: name,
        avatar: avatar,
      };

      users.push(newUser);
      currentUserId = newUser.id;
      persistAll();

      nameInput.value = '';
      closeModal('add-colleague-modal');
      renderUserSelect();
      renderColleaguesBalances();
      showToast(`Colleague jdid tzad: ${name}!`);
    }

    function setAvatarEmoji(emoji) {
      document.getElementById('new-colleague-avatar').value = emoji;
    }

    function handleAddProduct(e) {
      e.preventDefault();
      const name = document.getElementById('new-prod-name').value.trim();
      const emoji = document.getElementById('new-prod-emoji').value.trim() || '🍪';
      const category = document.getElementById('new-prod-category').value;
      const price = parseFloat(document.getElementById('new-prod-price').value);
      const stock = parseInt(document.getElementById('new-prod-stock').value, 10) || 0;

      if (!name || isNaN(price)) return;

      const newProd = {
        id: 'p_' + Date.now(),
        name,
        category,
        price,
        stock,
        emoji,
      };

      products.unshift(newProd);
      persistAll();
      closeModal('add-product-modal');
      
      // Reset
      document.getElementById('new-prod-name').value = '';
      
      renderCategoryPills();
      filterProducts();
      renderAdminInventory();
      showToast(`Produit jdid tzad: ${name} (${price} DH)`);
    }

    function exportDataJSON() {
      const payload = {
        app: 'L-Karne-SnackBox',
        exportedAt: new Date().toISOString(),
        users,
        products,
        transactions,
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `lkarne_backup_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      showToast('Fichier JSON de sauvegarde téléchargé! 💾');
    }

    function importDataJSON(e) {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function(event) {
        try {
          const parsed = JSON.parse(event.target.result);
          if (parsed.users && parsed.products && parsed.transactions) {
            users = parsed.users;
            products = parsed.products;
            transactions = parsed.transactions;
            currentUserId = users[0]?.id || null;
            persistAll();
            initUI();
            showToast('Données restaurées avec succès! ✅');
          } else {
            showToast('Format de fichier JSON invalide', 'error');
          }
        } catch (err) {
          showToast('Erreur lors de la lecture du fichier JSON', 'error');
        }
      };
      reader.readAsText(file);
    }

    function exportTransactionsCSV() {
      if (transactions.length === 0) {
        showToast('Walo kridi ola transactions f l\'historique!', 'info');
        return;
      }

      let csv = "ID,Date,Heure,Colleague,Type,Article_Note,Montant_DH,Statut\n";
      transactions.forEach(t => {
        const d = new Date(t.timestamp);
        const dateStr = d.toLocaleDateString('fr-FR');
        const timeStr = d.toLocaleTimeString('fr-FR');
        const detail = (t.type === 'PAYMENT' ? (t.note || 'Reglement') : t.productName).replace(/,/g, ' ');
        const status = t.paid ? 'PAYE' : 'NON_PAYE';
        csv += `${t.id},${dateStr},${timeStr},"${t.userName}",${t.type},"${detail}",${t.amount},${status}\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('href', url);
      a.setAttribute('download', `lkarne_transactions_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(a);
      a.click();
      a.remove();
      showToast('Export CSV généré pour Excel / Google Sheets! 📊');
    }

    function switchView(viewName) {
      const storeSection = document.getElementById('view-store');
      const tabSection = document.getElementById('view-tab');
      const adminSection = document.getElementById('view-admin');

      const navStore = document.getElementById('nav-store');
      const navTab = document.getElementById('nav-tab');
      const navAdmin = document.getElementById('nav-admin');

      // Hide all
      storeSection.classList.add('hidden');
      tabSection.classList.add('hidden');
      adminSection.classList.add('hidden');

      // Reset tab active styles
      [navStore, navTab, navAdmin].forEach(btn => {
        if (!btn) return;
        btn.classList.remove('bg-emerald-50', 'text-emerald-700');
        btn.classList.add('text-slate-600');
      });

      if (viewName === 'store') {
        storeSection.classList.remove('hidden');
        navStore.classList.add('bg-emerald-50', 'text-emerald-700');
        navStore.classList.remove('text-slate-600');
      } else if (viewName === 'tab') {
        tabSection.classList.remove('hidden');
        navTab.classList.add('bg-emerald-50', 'text-emerald-700');
        navTab.classList.remove('text-slate-600');
        renderColleaguesBalances();
        renderTransactions();
      } else if (viewName === 'admin') {
        adminSection.classList.remove('hidden');
        navAdmin.classList.add('bg-emerald-50', 'text-emerald-700');
        navAdmin.classList.remove('text-slate-600');
        renderAdminInventory();
      }

      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function openModal(id) {
      const m = document.getElementById(id);
      if (m) m.classList.remove('hidden');
    }

    function closeModal(id) {
      const m = document.getElementById(id);
      if (m) m.classList.add('hidden');
    }

    function showToast(message, type = 'info') {
      const container = document.getElementById('toast-container');
      if (!container) return;

      const toast = document.createElement('div');
      toast.className = `pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold transform transition-all duration-300 translate-y-2 opacity-0 ${
        type === 'error' 
          ? 'bg-rose-50 text-rose-800 border-rose-200' 
          : type === 'info' 
          ? 'bg-slate-900 text-white border-slate-800'
          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
      }`;

      toast.innerHTML = `
        <span>${type === 'error' ? '⚠️' : type === 'info' ? 'ℹ️' : '✅'}</span>
        <span class="flex-1">${message}</span>
      `;

      container.appendChild(toast);
      
      // Animate in
      requestAnimationFrame(() => {
        toast.classList.remove('translate-y-2', 'opacity-0');
      });

      // Auto dismiss
      setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-2');
        setTimeout(() => toast.remove(), 300);
      }, 3500);
    }

    function initUI() {
      renderUserSelect();
      renderCategoryPills();
      filterProducts();
      renderColleaguesBalances();
      renderTransactions();
      applyAdminState();
      lucide.createIcons();
    }

    window.addEventListener('DOMContentLoaded', () => {
      initData();
      initUI();
    });
  </script>
</body>
</html>