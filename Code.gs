/**
 * ==============================================================================
 * L-KARNÉ (SnackBox & Kridi Tracker) - Backend Engine
 * Platform: Google Apps Script (GAS) Web App
 * Backed by: Google Sheets on Admin's Google Drive
 * ==============================================================================
 */

// Configuration & Sheet Names
const CONFIG = {
  SHEET_PRODUCTS: 'Products',
  SHEET_USERS: 'Users',
  SHEET_TRANSACTIONS: 'Transactions',
  TOKEN_EXPIRY_HOURS: 72, // 3 days session validity
  LOCK_TIMEOUT_MS: 15000,  // 15s lock wait to handle concurrent kiosk taps
};

/**
 * Helper to get or create a persistent secret key for HMAC token signing
 */
function getSecretKey() {
  const props = PropertiesService.getScriptProperties();
  let secret = props.getProperty('JWT_SECRET');
  if (!secret) {
    secret = Utilities.getUuid() + '-' + Utilities.getUuid();
    props.setProperty('JWT_SECRET', secret);
  }
  return secret;
}

/**
 * SHA-256 Hash for User PINs
 */
function hashPin(pin) {
  const rawHash = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(pin).trim(),
    Utilities.Charset.UTF_8
  );
  return rawHash.map(function (byte) {
    const v = (byte < 0 ? byte + 256 : byte).toString(16);
    return v.length === 1 ? '0' + v : v;
  }).join('');
}

/**
 * Generate a tamper-proof session token: userId.role.expiresAt.signature
 */
function generateSessionToken(userId, role) {
  const expiresAt = Date.now() + CONFIG.TOKEN_EXPIRY_HOURS * 3600 * 1000;
  const payload = userId + '.' + role + '.' + expiresAt;
  const signatureBytes = Utilities.computeHmacSha256Signature(payload, getSecretKey());
  const signature = Utilities.base64EncodeWebSafe(signatureBytes);
  return payload + '.' + signature;
}

/**
 * Verify session token and return user session object or null
 */
function verifySessionToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 4) return null;

  const [userId, role, expiresAtStr, receivedSig] = parts;
  const expiresAt = parseInt(expiresAtStr, 10);
  if (isNaN(expiresAt) || Date.now() > expiresAt) {
    return null; // Expired
  }

  const payload = userId + '.' + role + '.' + expiresAtStr;
  const expectedSigBytes = Utilities.computeHmacSha256Signature(payload, getSecretKey());
  const expectedSig = Utilities.base64EncodeWebSafe(expectedSigBytes);

  if (receivedSig !== expectedSig) {
    return null; // Tampered or invalid
  }

  return { userId: userId, role: role, expiresAt: expiresAt };
}

/**
 * Get the active Spreadsheet instance
 */
function getSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * CORS and JSON Response Helper
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handle HTTP GET Requests (Health check, diagnostics, or ping)
 */
function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'ping';
  const callback = e && e.parameter && e.parameter.callback;

  let responseData = { success: false, error: 'Action GET invalide' };

  if (action === 'ping') {
    responseData = {
      success: true,
      service: 'L-Karné Web App API',
      status: 'online',
      timestamp: new Date().toISOString()
    };
  } else if (action === 'setup') {
    responseData = setupDatabase();
  } else if (action === 'auth/list_public_users') {
    responseData = handleListPublicUsers();
  }

  // Support JSONP for environments with strict CORS policies or file:// origins
  if (callback) {
    return ContentService.createTextOutput(callback + '(' + JSON.stringify(responseData) + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return createJsonResponse(responseData);
}

/**
 * Handle HTTP POST Requests (Main API Gateway)
 */
function doPost(e) {
  try {
    let body = {};
    if (e && e.postData && e.postData.contents) {
      try {
        body = JSON.parse(e.postData.contents);
      } catch (err) {
        return createJsonResponse({ success: false, error: 'Malformed JSON payload: ' + err.message });
      }
    } else if (e && e.parameter) {
      body = e.parameter;
    }

    const action = body.action || (e && e.parameter && e.parameter.action);

    // Route public endpoints
    if (action === 'auth/login') {
      return createJsonResponse(handleLogin(body));
    }
    if (action === 'auth/list_public_users') {
      return createJsonResponse(handleListPublicUsers());
    }

    // Validate authentication token for protected endpoints
    const token = body.token || (e && e.parameter && e.parameter.token);
    const session = verifySessionToken(token);
    if (!session) {
      return createJsonResponse({
        success: false,
        error: 'Unauthorized: Session invalid or expired. Please sign in again.'
      });
    }

    // Route protected endpoints
    switch (action) {
      // Colleague routes
      case 'colleague/dashboard':
        return createJsonResponse(handleColleagueDashboard(session));

      case 'colleague/purchase':
        return createJsonResponse(handleColleaguePurchase(session, body));

      // Admin routes
      case 'admin/overview':
        if (session.role !== 'admin') {
          return createJsonResponse({ success: false, error: 'Forbidden: Admin privilege required' });
        }
        return createJsonResponse(handleAdminOverview());

      case 'admin/restock':
        if (session.role !== 'admin') {
          return createJsonResponse({ success: false, error: 'Forbidden: Admin privilege required' });
        }
        return createJsonResponse(handleAdminRestock(session, body));

      case 'admin/settle':
        if (session.role !== 'admin') {
          return createJsonResponse({ success: false, error: 'Forbidden: Admin privilege required' });
        }
        return createJsonResponse(handleAdminSettle(session, body));

      case 'admin/add_product':
        if (session.role !== 'admin') {
          return createJsonResponse({ success: false, error: 'Forbidden: Admin privilege required' });
        }
        return createJsonResponse(handleAdminAddProduct(session, body));

      case 'admin/add_user':
        if (session.role !== 'admin') {
          return createJsonResponse({ success: false, error: 'Forbidden: Admin privilege required' });
        }
        return createJsonResponse(handleAdminAddUser(session, body));

      default:
        return createJsonResponse({ success: false, error: 'Unknown action: ' + action });
    }
  } catch (globalError) {
    return createJsonResponse({
      success: false,
      error: 'Internal Server Error: ' + globalError.toString()
    });
  }
}

/**
 * Public User List (For kiosk user avatars/names only, NO pin_hash, NO balance!)
 */
function handleListPublicUsers() {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_USERS);
  if (!sheet) return { success: false, error: 'Users sheet not found' };

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { success: true, users: [] };

  const headers = data[0].map(h => String(h).trim().toLowerCase());
  const idxId = headers.indexOf('id');
  const idxName = headers.indexOf('name');
  const idxUsername = headers.indexOf('username');
  const idxRole = headers.indexOf('role');

  const users = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[idxId]) {
      users.push({
        id: String(row[idxId]),
        name: String(row[idxName] || ''),
        username: String(row[idxUsername] || ''),
        role: String(row[idxRole] || 'user')
      });
    }
  }

  return { success: true, users: users };
}

/**
 * Handle Login (Authenticates username + PIN, produces session token)
 */
function handleLogin(body) {
  const username = String(body.username || '').trim().toLowerCase();
  const pin = String(body.pin || '').trim();

  if (!username || !pin) {
    return { success: false, error: 'Veuillez saisir votre identifiant et votre code PIN.' };
  }

  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_USERS);
  if (!sheet) return { success: false, error: 'Users sheet not initialized' };

  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim().toLowerCase());

  const idxId = headers.indexOf('id');
  const idxName = headers.indexOf('name');
  const idxUsername = headers.indexOf('username');
  const idxPinHash = headers.indexOf('pin_hash');
  const idxRole = headers.indexOf('role');
  const idxBalance = headers.indexOf('balance_mad');

  const hashedInputPin = hashPin(pin);

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowUser = String(row[idxUsername]).trim().toLowerCase();

    if (rowUser === username) {
      const storedHash = String(row[idxPinHash]).trim();
      if (storedHash.toLowerCase() === hashedInputPin.toLowerCase()) {
        const userId = String(row[idxId]);
        const role = String(row[idxRole] || 'user');
        const token = generateSessionToken(userId, role);

        return {
          success: true,
          token: token,
          user: {
            id: userId,
            name: String(row[idxName]),
            username: rowUser,
            role: role,
            balance_mad: Number(row[idxBalance] || 0)
          }
        };
      } else {
        return { success: false, error: 'Code PIN incorrect.' };
      }
    }
  }

  return { success: false, error: 'Utilisateur introuvable.' };
}

/**
 * Colleague Dashboard: STRICT PRIVACY ENFORCED
 * Returns ONLY the caller's balance, personal transactions, and product catalog.
 */
function handleColleagueDashboard(session) {
  const ss = getSpreadsheet();

  // 1. Get User Profile & Balance
  const usersSheet = ss.getSheetByName(CONFIG.SHEET_USERS);
  const usersData = usersSheet.getDataRange().getValues();
  const uHeaders = usersData[0].map(h => String(h).trim().toLowerCase());
  const uIdCol = uHeaders.indexOf('id');
  const uNameCol = uHeaders.indexOf('name');
  const uUsernameCol = uHeaders.indexOf('username');
  const uRoleCol = uHeaders.indexOf('role');
  const uBalCol = uHeaders.indexOf('balance_mad');

  let currentUser = null;
  for (let i = 1; i < usersData.length; i++) {
    const row = usersData[i];
    if (String(row[uIdCol]) === session.userId) {
      currentUser = {
        id: String(row[uIdCol]),
        name: String(row[uNameCol]),
        username: String(row[uUsernameCol]),
        role: String(row[uRoleCol] || 'user'),
        balance_mad: Number(row[uBalCol] || 0)
      };
      break;
    }
  }

  if (!currentUser) {
    return { success: false, error: 'Compte utilisateur introuvable.' };
  }

  // 2. Get Products (Only active products)
  const productsSheet = ss.getSheetByName(CONFIG.SHEET_PRODUCTS);
  const pData = productsSheet.getDataRange().getValues();
  const pHeaders = pData[0].map(h => String(h).trim().toLowerCase());
  const pIdCol = pHeaders.indexOf('id');
  const pNameCol = pHeaders.indexOf('name');
  const pCatCol = pHeaders.indexOf('category');
  const pPriceCol = pHeaders.indexOf('price_mad');
  const pStockCol = pHeaders.indexOf('stock_qty');
  const pImgCol = pHeaders.indexOf('image_url');
  const pActiveCol = pHeaders.indexOf('is_active');

  const products = [];
  for (let i = 1; i < pData.length; i++) {
    const row = pData[i];
    const isActive = row[pActiveCol] === true || String(row[pActiveCol]).toUpperCase() === 'TRUE';
    if (isActive) {
      products.push({
        id: String(row[pIdCol]),
        name: String(row[pNameCol]),
        category: String(row[pCatCol] || 'Divers'),
        price_mad: Number(row[pPriceCol] || 0),
        stock_qty: parseInt(row[pStockCol], 10) || 0,
        image_url: String(row[pImgCol] || '')
      });
    }
  }

  // 3. Get Personal Transactions (FILTERED STRICTLY TO CURRENT USER ONLY)
  const txSheet = ss.getSheetByName(CONFIG.SHEET_TRANSACTIONS);
  const txData = txSheet.getDataRange().getValues();
  const txHeaders = txData[0].map(h => String(h).trim().toLowerCase());
  const tIdCol = txHeaders.indexOf('id');
  const tTimeCol = txHeaders.indexOf('timestamp');
  const tUserCol = txHeaders.indexOf('user_id');
  const tTypeCol = txHeaders.indexOf('type');
  const tItemIdCol = txHeaders.indexOf('item_id');
  const tItemNameCol = txHeaders.indexOf('item_name');
  const tQtyCol = txHeaders.indexOf('quantity');
  const tAmtCol = txHeaders.indexOf('amount_mad');
  const tNotesCol = txHeaders.indexOf('notes');

  const personalTransactions = [];
  // Read in reverse to get most recent first
  for (let i = txData.length - 1; i >= 1; i--) {
    const row = txData[i];
    if (String(row[tUserCol]) === session.userId) {
      personalTransactions.push({
        id: String(row[tIdCol]),
        timestamp: row[tTimeCol],
        type: String(row[tTypeCol]),
        item_id: String(row[tItemIdCol] || ''),
        item_name: String(row[tItemNameCol] || ''),
        quantity: parseInt(row[tQtyCol], 10) || 1,
        amount_mad: Number(row[tAmtCol] || 0),
        notes: String(row[tNotesCol] || '')
      });
      if (personalTransactions.length >= 50) break; // Limit to 50 recent records
    }
  }

  return {
    success: true,
    user: currentUser,
    products: products,
    transactions: personalTransactions
  };
}

/**
 * Colleague Purchase (Atomic stock decrement + user debt increment)
 */
function handleColleaguePurchase(session, body) {
  const productId = String(body.productId || '').trim();
  const quantity = Math.max(1, parseInt(body.quantity, 10) || 1);

  if (!productId) {
    return { success: false, error: 'Produit invalide.' };
  }

  const lock = LockService.getScriptLock();
  try {
    const hasLock = lock.tryLock(CONFIG.LOCK_TIMEOUT_MS);
    if (!hasLock) {
      return { success: false, error: 'Serveur occupé. Veuillez réessayer dans quelques instants.' };
    }

    const ss = getSpreadsheet();
    const pSheet = ss.getSheetByName(CONFIG.SHEET_PRODUCTS);
    const uSheet = ss.getSheetByName(CONFIG.SHEET_USERS);
    const tSheet = ss.getSheetByName(CONFIG.SHEET_TRANSACTIONS);

    // 1. Locate Product
    const pData = pSheet.getDataRange().getValues();
    const pHeaders = pData[0].map(h => String(h).trim().toLowerCase());
    const pIdCol = pHeaders.indexOf('id');
    const pNameCol = pHeaders.indexOf('name');
    const pPriceCol = pHeaders.indexOf('price_mad');
    const pStockCol = pHeaders.indexOf('stock_qty');
    const pActiveCol = pHeaders.indexOf('is_active');

    let productRowIndex = -1;
    let productObj = null;

    for (let i = 1; i < pData.length; i++) {
      if (String(pData[i][pIdCol]) === productId) {
        productRowIndex = i + 1; // 1-indexed for Sheets API
        productObj = {
          name: String(pData[i][pNameCol]),
          price: Number(pData[i][pPriceCol]),
          stock: parseInt(pData[i][pStockCol], 10) || 0,
          isActive: pData[i][pActiveCol] === true || String(pData[i][pActiveCol]).toUpperCase() === 'TRUE'
        };
        break;
      }
    }

    if (!productObj || !productObj.isActive) {
      return { success: false, error: 'Produit introuvable ou inactif.' };
    }

    if (productObj.stock < quantity) {
      return { success: false, error: 'Stock insuffisant ! Il ne reste que ' + productObj.stock + ' pièce(s).' };
    }

    // 2. Locate User
    const uData = uSheet.getDataRange().getValues();
    const uHeaders = uData[0].map(h => String(h).trim().toLowerCase());
    const uIdCol = uHeaders.indexOf('id');
    const uNameCol = uHeaders.indexOf('name');
    const uBalCol = uHeaders.indexOf('balance_mad');

    let userRowIndex = -1;
    let userName = '';
    let currentBalance = 0;

    for (let i = 1; i < uData.length; i++) {
      if (String(uData[i][uIdCol]) === session.userId) {
        userRowIndex = i + 1;
        userName = String(uData[i][uNameCol]);
        currentBalance = Number(uData[i][uBalCol] || 0);
        break;
      }
    }

    if (userRowIndex === -1) {
      return { success: false, error: 'Utilisateur non trouvé.' };
    }

    // 3. Compute new values
    const totalCost = Math.round(productObj.price * quantity * 100) / 100;
    const newStock = productObj.stock - quantity;
    const newBalance = Math.round((currentBalance + totalCost) * 100) / 100;

    // 4. Update Product Stock in Sheet
    pSheet.getRange(productRowIndex, pStockCol + 1).setValue(newStock);

    // 5. Update User Balance in Sheet
    uSheet.getRange(userRowIndex, uBalCol + 1).setValue(newBalance);

    // 6. Append Row to Transactions
    const txId = 'TX-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    const timestamp = new Date().toISOString();
    tSheet.appendRow([
      txId,
      timestamp,
      session.userId,
      userName,
      'purchase',
      productId,
      productObj.name,
      quantity,
      totalCost,
      'Achat libre-service'
    ]);

    return {
      success: true,
      message: 'Bssaha ! Article enregistré.',
      transaction: {
        id: txId,
        itemName: productObj.name,
        quantity: quantity,
        amount: totalCost,
        newBalance: newBalance,
        newStock: newStock
      }
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Admin Overview (User balances, total office debt, full inventory metrics)
 */
function handleAdminOverview() {
  const ss = getSpreadsheet();

  // Users overview
  const uSheet = ss.getSheetByName(CONFIG.SHEET_USERS);
  const uData = uSheet.getDataRange().getValues();
  const uHeaders = uData[0].map(h => String(h).trim().toLowerCase());
  const uIdCol = uHeaders.indexOf('id');
  const uNameCol = uHeaders.indexOf('name');
  const uUsernameCol = uHeaders.indexOf('username');
  const uRoleCol = uHeaders.indexOf('role');
  const uBalCol = uHeaders.indexOf('balance_mad');
  const uCreatedCol = uHeaders.indexOf('created_at');

  const users = [];
  let totalOfficeDebt = 0;
  for (let i = 1; i < uData.length; i++) {
    const row = uData[i];
    if (row[uIdCol]) {
      const balance = Number(row[uBalCol] || 0);
      if (balance > 0) totalOfficeDebt += balance;

      users.push({
        id: String(row[uIdCol]),
        name: String(row[uNameCol]),
        username: String(row[uUsernameCol]),
        role: String(row[uRoleCol] || 'user'),
        balance_mad: balance,
        created_at: row[uCreatedCol]
      });
    }
  }

  // Products overview
  const pSheet = ss.getSheetByName(CONFIG.SHEET_PRODUCTS);
  const pData = pSheet.getDataRange().getValues();
  const pHeaders = pData[0].map(h => String(h).trim().toLowerCase());
  const pIdCol = pHeaders.indexOf('id');
  const pNameCol = pHeaders.indexOf('name');
  const pCatCol = pHeaders.indexOf('category');
  const pPriceCol = pHeaders.indexOf('price_mad');
  const pStockCol = pHeaders.indexOf('stock_qty');
  const pImgCol = pHeaders.indexOf('image_url');
  const pActiveCol = pHeaders.indexOf('is_active');

  const products = [];
  let lowStockCount = 0;
  for (let i = 1; i < pData.length; i++) {
    const row = pData[i];
    if (row[pIdCol]) {
      const stock = parseInt(row[pStockCol], 10) || 0;
      if (stock <= 3) lowStockCount++;

      products.push({
        id: String(row[pIdCol]),
        name: String(row[pNameCol]),
        category: String(row[pCatCol] || 'Divers'),
        price_mad: Number(row[pPriceCol] || 0),
        stock_qty: stock,
        image_url: String(row[pImgCol] || ''),
        is_active: row[pActiveCol] === true || String(row[pActiveCol]).toUpperCase() === 'TRUE'
      });
    }
  }

  // Recent 100 Transactions across the office
  const tSheet = ss.getSheetByName(CONFIG.SHEET_TRANSACTIONS);
  const tData = tSheet.getDataRange().getValues();
  const tHeaders = tData[0].map(h => String(h).trim().toLowerCase());
  const tIdCol = tHeaders.indexOf('id');
  const tTimeCol = tHeaders.indexOf('timestamp');
  const tUserCol = tHeaders.indexOf('user_id');
  const tUserNameCol = tHeaders.indexOf('user_name');
  const tTypeCol = tHeaders.indexOf('type');
  const tItemIdCol = tHeaders.indexOf('item_id');
  const tItemNameCol = tHeaders.indexOf('item_name');
  const tQtyCol = tHeaders.indexOf('quantity');
  const tAmtCol = tHeaders.indexOf('amount_mad');
  const tNotesCol = tHeaders.indexOf('notes');

  const recentTransactions = [];
  for (let i = tData.length - 1; i >= 1; i--) {
    const row = tData[i];
    if (row[tIdCol]) {
      recentTransactions.push({
        id: String(row[tIdCol]),
        timestamp: row[tTimeCol],
        user_id: String(row[tUserCol]),
        user_name: String(row[tUserNameCol]),
        type: String(row[tTypeCol]),
        item_id: String(row[tItemIdCol] || ''),
        item_name: String(row[tItemNameCol] || ''),
        quantity: parseInt(row[tQtyCol], 10) || 1,
        amount_mad: Number(row[tAmtCol] || 0),
        notes: String(row[tNotesCol] || '')
      });
      if (recentTransactions.length >= 100) break;
    }
  }

  return {
    success: true,
    metrics: {
      totalOfficeDebt: Math.round(totalOfficeDebt * 100) / 100,
      userCount: users.length,
      productCount: products.length,
      lowStockCount: lowStockCount
    },
    users: users,
    products: products,
    transactions: recentTransactions
  };
}

/**
 * Admin Restock: Adjust product stock quantity and log transaction
 */
function handleAdminRestock(session, body) {
  const productId = String(body.productId || '').trim();
  const addedQty = parseInt(body.addedQty, 10);

  if (!productId || isNaN(addedQty)) {
    return { success: false, error: 'Paramètres de restock invalides.' };
  }

  const lock = LockService.getScriptLock();
  try {
    const hasLock = lock.tryLock(CONFIG.LOCK_TIMEOUT_MS);
    if (!hasLock) return { success: false, error: 'Serveur occupé.' };

    const ss = getSpreadsheet();
    const pSheet = ss.getSheetByName(CONFIG.SHEET_PRODUCTS);
    const tSheet = ss.getSheetByName(CONFIG.SHEET_TRANSACTIONS);

    const pData = pSheet.getDataRange().getValues();
    const pHeaders = pData[0].map(h => String(h).trim().toLowerCase());
    const pIdCol = pHeaders.indexOf('id');
    const pNameCol = pHeaders.indexOf('name');
    const pStockCol = pHeaders.indexOf('stock_qty');

    let pRowIndex = -1;
    let pName = '';
    let currentStock = 0;

    for (let i = 1; i < pData.length; i++) {
      if (String(pData[i][pIdCol]) === productId) {
        pRowIndex = i + 1;
        pName = String(pData[i][pNameCol]);
        currentStock = parseInt(pData[i][pStockCol], 10) || 0;
        break;
      }
    }

    if (pRowIndex === -1) return { success: false, error: 'Produit introuvable.' };

    const newStock = Math.max(0, currentStock + addedQty);
    pSheet.getRange(pRowIndex, pStockCol + 1).setValue(newStock);

    // Log restock transaction
    const txId = 'TX-RST-' + Date.now();
    tSheet.appendRow([
      txId,
      new Date().toISOString(),
      session.userId,
      'Admin Restock',
      'restock',
      productId,
      pName,
      addedQty,
      0,
      'Restock: ' + (addedQty >= 0 ? '+' : '') + addedQty + ' (Nouveau stock: ' + newStock + ')'
    ]);

    return {
      success: true,
      message: 'Stock mis à jour avec succès.',
      productId: productId,
      newStock: newStock
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Admin Settle: Record colleague cash payment and reduce/clear debt
 */
function handleAdminSettle(session, body) {
  const targetUserId = String(body.userId || '').trim();
  const amountPaid = parseFloat(body.amount);
  const notes = String(body.notes || 'Paiement en espèces réglé').trim();

  if (!targetUserId || isNaN(amountPaid) || amountPaid <= 0) {
    return { success: false, error: 'Montant ou utilisateur invalide.' };
  }

  const lock = LockService.getScriptLock();
  try {
    const hasLock = lock.tryLock(CONFIG.LOCK_TIMEOUT_MS);
    if (!hasLock) return { success: false, error: 'Serveur occupé.' };

    const ss = getSpreadsheet();
    const uSheet = ss.getSheetByName(CONFIG.SHEET_USERS);
    const tSheet = ss.getSheetByName(CONFIG.SHEET_TRANSACTIONS);

    const uData = uSheet.getDataRange().getValues();
    const uHeaders = uData[0].map(h => String(h).trim().toLowerCase());
    const uIdCol = uHeaders.indexOf('id');
    const uNameCol = uHeaders.indexOf('name');
    const uBalCol = uHeaders.indexOf('balance_mad');

    let uRowIndex = -1;
    let userName = '';
    let currentBalance = 0;

    for (let i = 1; i < uData.length; i++) {
      if (String(uData[i][uIdCol]) === targetUserId) {
        uRowIndex = i + 1;
        userName = String(uData[i][uNameCol]);
        currentBalance = Number(uData[i][uBalCol] || 0);
        break;
      }
    }

    if (uRowIndex === -1) return { success: false, error: 'Utilisateur introuvable.' };

    const newBalance = Math.round(Math.max(0, currentBalance - amountPaid) * 100) / 100;
    uSheet.getRange(uRowIndex, uBalCol + 1).setValue(newBalance);

    // Log payment transaction
    const txId = 'TX-PAY-' + Date.now();
    tSheet.appendRow([
      txId,
      new Date().toISOString(),
      targetUserId,
      userName,
      'payment',
      '',
      'Règlement dette',
      1,
      amountPaid,
      notes
    ]);

    return {
      success: true,
      message: 'Règlement de ' + amountPaid.toFixed(2) + ' DH enregistré pour ' + userName,
      userId: targetUserId,
      newBalance: newBalance
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Admin: Add New Product
 */
function handleAdminAddProduct(session, body) {
  const name = String(body.name || '').trim();
  const category = String(body.category || 'Snacks').trim();
  const price = parseFloat(body.price_mad);
  const stock = parseInt(body.stock_qty, 10) || 0;
  const imageUrl = String(body.image_url || '🍫').trim();

  if (!name || isNaN(price) || price < 0) {
    return { success: false, error: 'Nom et prix valides requis.' };
  }

  const ss = getSpreadsheet();
  const pSheet = ss.getSheetByName(CONFIG.SHEET_PRODUCTS);
  const id = 'prod_' + Date.now();

  pSheet.appendRow([
    id,
    name,
    category,
    price,
    stock,
    imageUrl,
    true
  ]);

  return { success: true, message: 'Produit ajouté avec succès !', id: id };
}

/**
 * Admin: Add New User
 */
function handleAdminAddUser(session, body) {
  const name = String(body.name || '').trim();
  const username = String(body.username || '').trim().toLowerCase();
  const pin = String(body.pin || '1234').trim();
  const role = String(body.role || 'user').trim().toLowerCase();

  if (!name || !username || !pin) {
    return { success: false, error: 'Nom, identifiant et code PIN requis.' };
  }

  const ss = getSpreadsheet();
  const uSheet = ss.getSheetByName(CONFIG.SHEET_USERS);
  const uData = uSheet.getDataRange().getValues();
  const uHeaders = uData[0].map(h => String(h).trim().toLowerCase());
  const idxUser = uHeaders.indexOf('username');

  for (let i = 1; i < uData.length; i++) {
    if (String(uData[i][idxUser]).trim().toLowerCase() === username) {
      return { success: false, error: "Cet identifiant d'utilisateur existe déjà." };
    }
  }

  const id = 'user_' + Date.now();
  const pinHash = hashPin(pin);

  uSheet.appendRow([
    id,
    name,
    username,
    pinHash,
    role === 'admin' ? 'admin' : 'user',
    0,
    new Date().toISOString()
  ]);

  return { success: true, message: 'Utilisateur ' + name + ' créé avec succès !', id: id };
}

/**
 * Setup and Seed Database with initial tabs and Moroccan office snacks
 * Run this function once from Apps Script Editor or via GET ?action=setup
 */
function setupDatabase() {
  const ss = getSpreadsheet();

  // 1. Tab: Products
  let pSheet = ss.getSheetByName(CONFIG.SHEET_PRODUCTS);
  if (!pSheet) {
    pSheet = ss.insertSheet(CONFIG.SHEET_PRODUCTS);
  }
  if (pSheet.getLastRow() === 0) {
    pSheet.appendRow(['id', 'name', 'category', 'price_mad', 'stock_qty', 'image_url', 'is_active']);
    pSheet.getRange(1, 1, 1, 7).setFontWeight('bold').setBackground('#e2e8f0');

    // Seed Moroccan office snacks
    const seedProducts = [
      ['p1', 'Eau Minérale Sidi Ali (50cl)', 'Boissons', 3.5, 24, '💧', true],
      ['p2', 'Eau Minérale Ain Saiss (50cl)', 'Boissons', 3.5, 20, '💧', true],
      ['p3', 'Coca-Cola Canette (33cl)', 'Boissons', 6.0, 15, '🥤', true],
      ['p4', 'Poms Pomme Canette (33cl)', 'Boissons', 5.5, 12, '🍏', true],
      ['p5', 'Hawai Tropical Canette (33cl)', 'Boissons', 5.5, 12, '🍍', true],
      ['p6', 'Raibi Jamila Original', 'Boissons', 2.5, 18, '🍓', true],
      ['p7', 'Merendina Original Chocolat', 'Biscuits', 2.5, 25, '🍫', true],
      ['p8', 'Bimo Golden Classique', 'Biscuits', 2.0, 20, '🍪', true],
      ['p9', 'KitKat 4 Fingers', 'Biscuits', 6.5, 10, '🍫', true],
      ['p10', 'Chips Lay\'s Fromage', 'Snacks', 4.0, 14, '🥔', true],
      ['p11', 'Chips Lay\'s Sel', 'Snacks', 4.0, 10, '🍟', true],
      ['p12', 'Capsule Café Nespresso', 'Café', 4.5, 30, '☕', true],
      ['p13', 'Nescafé 3en1 Stick', 'Café', 2.5, 20, '☕', true]
    ];
    pSheet.getRange(2, 1, seedProducts.length, 7).setValues(seedProducts);
  }

  // 2. Tab: Users
  let uSheet = ss.getSheetByName(CONFIG.SHEET_USERS);
  if (!uSheet) {
    uSheet = ss.insertSheet(CONFIG.SHEET_USERS);
  }
  if (uSheet.getLastRow() === 0) {
    uSheet.appendRow(['id', 'name', 'username', 'pin_hash', 'role', 'balance_mad', 'created_at']);
    uSheet.getRange(1, 1, 1, 7).setFontWeight('bold').setBackground('#e2e8f0');

    // Default Seed Users (Admin PIN: '9999', Colleague PIN: '1234')
    const now = new Date().toISOString();
    const seedUsers = [
      ['u_admin', 'Admin Bureau', 'admin', hashPin('9999'), 'admin', 0, now],
      ['u_aziz', 'Aziz El Mehammedy', 'aziz', hashPin('1234'), 'user', 0, now],
      ['u_omar', 'Omar Bennani', 'omar', hashPin('1234'), 'user', 0, now],
      ['u_salma', 'Salma Alami', 'salma', hashPin('1234'), 'user', 0, now],
      ['u_mehdi', 'Mehdi Tazi', 'mehdi', hashPin('1234'), 'user', 0, now]
    ];
    uSheet.getRange(2, 1, seedUsers.length, 7).setValues(seedUsers);
  }

  // 3. Tab: Transactions
  let tSheet = ss.getSheetByName(CONFIG.SHEET_TRANSACTIONS);
  if (!tSheet) {
    tSheet = ss.insertSheet(CONFIG.SHEET_TRANSACTIONS);
  }
  if (tSheet.getLastRow() === 0) {
    tSheet.appendRow(['id', 'timestamp', 'user_id', 'user_name', 'type', 'item_id', 'item_name', 'quantity', 'amount_mad', 'notes']);
    tSheet.getRange(1, 1, 1, 10).setFontWeight('bold').setBackground('#e2e8f0');
  }

  return {
    success: true,
    message: 'Base de données L-Karné initialisée avec succès avec les 3 onglets et les données de test !'
  };
}