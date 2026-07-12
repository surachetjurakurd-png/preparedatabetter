/**
 * Simple Proxy Server for API Requests
 * Run: node proxy-server.js
 * Server will listen on http://localhost:3000
 */

const http = require('http');
const https = require('https');
const url = require('url');
const { Client } = require('pg');

const BASE_PORT = Number(process.env.PORT || 3000);
const MAX_PORT_TRIES = 10;

function getConnectionError(connection) {
  if (!connection || typeof connection !== 'object') {
    return 'Connection object is invalid';
  }
  
  const required = ['host', 'port', 'database', 'user', 'password'];
  for (const field of required) {
    const value = connection[field];
    if (value === undefined || value === null || String(value).trim() === '') {
      return `Missing or invalid DB field: ${field}`;
    }
  }
  return null;
}

function getCaseInsensitiveFieldValue(row, fieldName) {
  if (!row || typeof row !== 'object') {
    return null;
  }

  if (Object.prototype.hasOwnProperty.call(row, fieldName)) {
    return row[fieldName];
  }

  const target = String(fieldName || '').toLowerCase();
  const keys = Object.keys(row);
  const key = keys.find((item) => String(item).toLowerCase() === target);
  if (!key) {
    return null;
  }

  return row[key];
}

const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.url === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'OK', message: 'Proxy server is running' }));
    return;
  }

  if (req.method === 'POST' && req.url === '/api/proxy') {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const targetUrl = data.url;
        const payload = data.payload;
        const method = String(data.method || 'POST').toUpperCase();
        const headers = data.headers || {};

        if (!targetUrl) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'URL is required' }));
          return;
        }

        console.log(`Proxying request to: ${targetUrl}`);

        // Parse URL and make request
        const parsedUrl = url.parse(targetUrl);
        const protocol = parsedUrl.protocol === 'https:' ? https : http;

        const hasHeader = (headerMap, headerName) => {
          const target = String(headerName || '').toLowerCase();
          return Object.keys(headerMap || {}).some((key) => String(key).toLowerCase() === target);
        };

        const canHaveBody = method !== 'GET' && method !== 'HEAD';
        const hasPayload = canHaveBody && payload !== undefined && payload !== null;
        const requestBody = hasPayload
          ? (typeof payload === 'string' ? payload : JSON.stringify(payload))
          : '';

        const requestHeaders = {
          ...headers
        };

        if (hasPayload && !hasHeader(requestHeaders, 'Content-Type')) {
          requestHeaders['Content-Type'] = 'application/json';
        }

        if (hasPayload) {
          requestHeaders['Content-Length'] = Buffer.byteLength(requestBody);
        }

        const options = {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
          path: parsedUrl.path,
          method,
          headers: requestHeaders
        };

        const proxyReq = protocol.request(options, (proxyRes) => {
          let responseBody = '';

          proxyRes.on('data', (chunk) => {
            responseBody += chunk.toString();
          });

          proxyRes.on('end', () => {
            res.writeHead(proxyRes.statusCode, {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            });

            try {
              // Try to parse as JSON
              const jsonResponse = JSON.parse(responseBody);
              res.end(JSON.stringify({
                success: true,
                status: proxyRes.statusCode,
                headers: proxyRes.headers,
                body: jsonResponse
              }));
            } catch (e) {
              // Return as text if not JSON
              res.end(JSON.stringify({
                success: true,
                status: proxyRes.statusCode,
                headers: proxyRes.headers,
                body: responseBody
              }));
            }
          });
        });

        proxyReq.on('error', (error) => {
          console.error('Proxy request error:', error);
          res.writeHead(500);
          res.end(JSON.stringify({
            success: false,
            error: error.message
          }));
        });

        if (hasPayload) {
          proxyReq.write(requestBody);
        }
        proxyReq.end();
      } catch (error) {
        console.error('Error:', error);
        res.writeHead(400);
        res.end(JSON.stringify({
          success: false,
          error: error.message
        }));
      }
    });
  } else if (req.method === 'POST' && req.url === '/api/db/insert-cust-info') {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      let client;
      try {
        const data = JSON.parse(body || '{}');
        const connection = data.connection || {};
        const values = data.values || {};

        if (!connection.host || !connection.port || !connection.database || !connection.user || !connection.password) {
          res.writeHead(400);
          res.end(JSON.stringify({
            success: false,
            error: 'Invalid DB connection settings'
          }));
          return;
        }

        if (!values.idNo || !values.cisId || !values.updateUser) {
          res.writeHead(400);
          res.end(JSON.stringify({
            success: false,
            error: 'Missing required insert values: idNo, cisId, updateUser'
          }));
          return;
        }

        client = new Client({
          host: connection.host,
          port: Number(connection.port),
          database: connection.database,
          user: connection.user,
          password: connection.password,
          ssl: { rejectUnauthorized: false }
        });

        await client.connect();

        const sql = `
          INSERT INTO rib.tb_m_cust_info
          (rib_id, id_type, id_no, status, username, firstname_en, lastname_en, prefer_lang, rib_subscription, pib_subscription, first_login_date, version_no, create_channel, create_user, create_date, update_channel, update_user, update_date, pib_status, cis_id, issue_country, customer_ref_id)
          SELECT
              nextval('rib.SEQ_CUST_INFO'), 'I', $1::varchar, 'A', NULL, NULL, NULL, 'TH',
              'Y', 'N', current_timestamp, 1, 'RIB', 'SYSTEM', current_timestamp, 'RIB', $2::varchar, current_timestamp, 'N', $3::varchar, 'TH', NULL
          WHERE NOT EXISTS (
              SELECT 1 FROM rib.tb_m_cust_info WHERE cis_id = $4::varchar
          );
        `;

        const result = await client.query(sql, [values.idNo, values.updateUser, values.cisId, values.cisId]);

        res.writeHead(200);
        res.end(JSON.stringify({
          success: true,
          env: data.env || 'unknown',
          rowCount: result.rowCount,
          message: result.rowCount === 0
            ? 'No row inserted because cis_id already exists'
            : 'Insert completed'
        }));
      } catch (error) {
        console.error('DB insert error:', error);
        res.writeHead(500);
        res.end(JSON.stringify({
          success: false,
          error: error.message
        }));
      } finally {
        if (client) {
          try {
            await client.end();
          } catch (e) {
            console.error('DB close error:', e.message);
          }
        }
      }
    });
  } else if (req.method === 'POST' && req.url === '/api/db/query-request-rp') {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      let client;
      try {
        const data = JSON.parse(body || '{}');
        const connection = data.connection || {};
        const values = data.values || {};
        const citizenId = String(values.citizenId || '').trim();
        const choose = String(values.choose || '').trim();
        const sqlTemplate = String(values.sqlTemplate || '').trim();

        const connectionError = getConnectionError(connection);
        if (connectionError) {
          res.writeHead(400);
          res.end(JSON.stringify({
            success: false,
            error: connectionError
          }));
          return;
        }

        if (!citizenId) {
          res.writeHead(400);
          res.end(JSON.stringify({
            success: false,
            error: 'Missing required value: citizenId'
          }));
          return;
        }

        if (!['rpRequestId', 'referenceDetail'].includes(choose)) {
          res.writeHead(400);
          res.end(JSON.stringify({
            success: false,
            error: 'Invalid choose value. Allowed: rpRequestId, referenceDetail'
          }));
          return;
        }

        if (!sqlTemplate) {
          res.writeHead(400);
          res.end(JSON.stringify({
            success: false,
            error: 'Missing required value: sqlTemplate'
          }));
          return;
        }

        const normalizedCitizenId = String(citizenId || '').trim();
        const queryText = sqlTemplate
          .replace(/{{value_update}}/g, choose)
          .replace(/{{DatacitizenID}}/g, normalizedCitizenId)
          .replace(/{{DataCitizenID}}/g, normalizedCitizenId)
          .replace(/{{identityID}}/g, normalizedCitizenId)
          .replace(/{{idNo}}/g, normalizedCitizenId)
          .replace(/(data\s*->>\s*'idNo'\s*=\s*)'[^']*'/gi, `$1'${normalizedCitizenId}'`);

        if (!/^\s*select\b/i.test(queryText)) {
          res.writeHead(400);
          res.end(JSON.stringify({
            success: false,
            error: 'Only SELECT query is allowed for this endpoint'
          }));
          return;
        }

        client = new Client({
          host: connection.host,
          port: Number(connection.port),
          database: connection.database,
          user: connection.user,
          password: connection.password,
          ssl: { rejectUnauthorized: false }
        });

        await client.connect();
        const result = await client.query(queryText);

        if (!result.rows || result.rows.length === 0) {
          res.writeHead(200);
          res.end(JSON.stringify({
            success: true,
            env: data.env || 'unknown',
            choose,
            value: '',
            rowCount: 0,
            query: queryText,
            message: 'No data found'
          }));
          return;
        }

        const firstRow = result.rows[0];
        let value = getCaseInsensitiveFieldValue(firstRow, choose);
        if (value === null || value === undefined) {
          const firstKey = Object.keys(firstRow)[0];
          value = firstKey ? firstRow[firstKey] : '';
        }

        res.writeHead(200);
        res.end(JSON.stringify({
          success: true,
          env: data.env || 'unknown',
          choose,
          value: value === null || value === undefined ? '' : String(value),
          rowCount: result.rowCount,
          query: queryText
        }));
      } catch (error) {
        console.error('DB query request RP error:', error);
        res.writeHead(500);
        res.end(JSON.stringify({
          success: false,
          error: error.message
        }));
      } finally {
        if (client) {
          try {
            await client.end();
          } catch (e) {
            console.error('DB close error:', e.message);
          }
        }
      }
    });
  } else if (req.method === 'POST' && req.url === '/api/db/cancel-onboarding-state') {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      let client;
      try {
        const data = JSON.parse(body || '{}');
        const connection = data.connection || {};
        const customerId = String(data.customerId || '').trim();
        const flowType = String(data.flowType || '').trim();
        const action = String(data.action || 'select').toLowerCase();

        const connectionError = getConnectionError(connection);
        if (connectionError) {
          res.writeHead(400);
          res.end(JSON.stringify({ success: false, error: connectionError }));
          return;
        }

        if (!customerId || !/^\d{13}$/.test(customerId)) {
          res.writeHead(400);
          res.end(JSON.stringify({ success: false, error: 'Invalid customerId: must be 13 digits' }));
          return;
        }

        if (!flowType) {
          res.writeHead(400);
          res.end(JSON.stringify({ success: false, error: 'Missing required value: flowType' }));
          return;
        }

        if (!['select', 'delete'].includes(action)) {
          res.writeHead(400);
          res.end(JSON.stringify({ success: false, error: 'Invalid action. Allowed: select, delete' }));
          return;
        }

        client = new Client({
          host: connection.host,
          port: Number(connection.port),
          database: connection.database,
          user: connection.user,
          password: connection.password,
          ssl: { rejectUnauthorized: false }
        });

        await client.connect();

        let result;
        let queryText;

        if (action === 'select') {
          queryText = `SELECT * FROM rib.tb_t_onboarding_state WHERE create_user = $1 AND flow = $2`;
          result = await client.query(queryText, [customerId, flowType]);
          res.writeHead(200);
          res.end(JSON.stringify({
            success: true,
            action: 'select',
            env: data.env || 'unknown',
            rowCount: result.rowCount,
            rows: result.rows,
            query: queryText
          }));
        } else {
          queryText = `DELETE FROM rib.tb_t_onboarding_state WHERE create_user = $1 AND flow = $2`;
          result = await client.query(queryText, [customerId, flowType]);
          res.writeHead(200);
          res.end(JSON.stringify({
            success: true,
            action: 'delete',
            env: data.env || 'unknown',
            rowCount: result.rowCount,
            message: result.rowCount === 0
              ? 'No rows deleted (state not found)'
              : `Deleted ${result.rowCount} row(s) successfully`,
            query: queryText
          }));
        }
      } catch (error) {
        console.error('DB cancel onboarding state error:', error);
        res.writeHead(500);
        res.end(JSON.stringify({ success: false, error: error.message }));
      } finally {
        if (client) {
          try {
            await client.end();
          } catch (e) {
            console.error('DB close error:', e.message);
          }
        }
      }
    });
  } else if (req.method === 'POST' && req.url === '/api/db/update-onboarding-state') {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      let client;
      try {
        const data = JSON.parse(body || '{}');
        const connection = data.connection || {};
        const customerId = String(data.customerId || '').trim();
        const stateField = String(data.stateField || '').trim();

        const connectionError = getConnectionError(connection);
        if (connectionError) {
          res.writeHead(400);
          res.end(JSON.stringify({ success: false, error: connectionError }));
          return;
        }

        if (!customerId || !/^\d{13}$/.test(customerId)) {
          res.writeHead(400);
          res.end(JSON.stringify({ success: false, error: 'Invalid customerId: must be 13 digits' }));
          return;
        }

        if (!stateField) {
          res.writeHead(400);
          res.end(JSON.stringify({ success: false, error: 'Missing required value: stateField' }));
          return;
        }

        client = new Client({
          host: connection.host,
          port: Number(connection.port),
          database: connection.database,
          user: connection.user,
          password: connection.password,
          ssl: { rejectUnauthorized: false }
        });

        await client.connect();

        const queryText = `UPDATE rib.tb_t_onboarding_state SET state = $1, sub_state = 'CANCELED' WHERE create_user = $2`;
        const result = await client.query(queryText, [stateField, customerId]);

        res.writeHead(200);
        res.end(JSON.stringify({
          success: true,
          env: data.env || 'unknown',
          rowCount: result.rowCount,
          message: result.rowCount === 0
            ? 'No rows updated (customer not found)'
            : `Updated ${result.rowCount} row(s) successfully`,
          query: queryText
        }));
      } catch (error) {
        console.error('DB update onboarding state error:', error);
        res.writeHead(500);
        res.end(JSON.stringify({ success: false, error: error.message }));
      } finally {
        if (client) {
          try {
            await client.end();
          } catch (e) {
            console.error('DB close error:', e.message);
          }
        }
      }
    });
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

let currentPort = BASE_PORT;
let attemptsLeft = MAX_PORT_TRIES;

server.on('error', (error) => {
  if (error && error.code === 'EADDRINUSE' && attemptsLeft > 1) {
    const nextPort = currentPort + 1;
    console.warn(`⚠️  Port ${currentPort} is in use, trying ${nextPort}...`);
    currentPort = nextPort;
    attemptsLeft -= 1;
    server.listen(currentPort);
    return;
  }

  console.error('❌ Failed to start proxy server:', error.message);
  process.exit(1);
});

server.on('listening', () => {
  const address = server.address();
  const runningPort = (address && typeof address === 'object' && address.port) ? address.port : currentPort;
  console.log(`✅ Proxy server running at http://localhost:${runningPort}`);
  console.log(`📍 Endpoint: POST http://localhost:${runningPort}/api/proxy`);
  console.log(`❤️  Health check: http://localhost:${runningPort}/health`);
});

server.listen(currentPort);
