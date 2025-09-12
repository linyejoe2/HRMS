import { Express } from 'express';
import path from 'path';

let ADODB: any;
try {
  // Try to import node-adodb only if available (Windows platform)
  ADODB = require('node-adodb');
} catch (error) {
  console.log('node-adodb not available in legacy routes - Access DB explorer disabled');
  ADODB = null;
}

export const setupLegacyRoutes = (app: Express) => {
  if (!ADODB) {
    console.log('Legacy Access DB routes disabled - node-adodb not available');
    return;
  }

  const dbPath = path.join(__dirname, '..', '..', '..', 'data', 'PGA.mdb');
  let connection: any;
  
  try {
    connection = ADODB.open(`Provider=Microsoft.Jet.OLEDB.4.0;Data Source=${dbPath};`);
  } catch (error) {
    console.warn('Failed to initialize Access DB connection for legacy routes:', error);
    return;
  }

  app.get('/db', async (req, res) => {
    try {
      // Use a more compatible approach - try to query schema info
      const schema = await connection.schema(20) as any; // 20 = adSchemaTables
      
      let html = `
      <!DOCTYPE html>
      <html>
      <head>
          <title>PGA Database Tables</title>
          <style>
              body { font-family: Arial, sans-serif; margin: 40px; }
              .table-list { margin: 20px 0; }
              .table-item { margin: 10px 0; padding: 10px; background-color: #f5f5f5; border-radius: 5px; }
              .table-name { font-weight: bold; color: #333; }
              .view-link { color: #007bff; text-decoration: none; margin-left: 10px; }
              .view-link:hover { text-decoration: underline; }
              .manual-entry { margin: 20px 0; padding: 15px; background-color: #e9ecef; border-radius: 5px; }
              .input-group { margin: 10px 0; }
              input[type="text"] { padding: 8px; margin-right: 10px; width: 200px; }
              button { padding: 8px 15px; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; }
              button:hover { background-color: #0056b3; }
              .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0; }
          </style>
          <script>
              function viewTable() {
                  const tableName = document.getElementById('tableNameInput').value.trim();
                  if (tableName) {
                      window.location.href = '/db/table/' + encodeURIComponent(tableName);
                  } else {
                      alert('Please enter a table name');
                  }
              }
          </script>
      </head>
      <body>
          <h1>PGA Database Explorer (Legacy)</h1>
          
          <div class="warning">
              <strong>⚠️ Development Only:</strong> This legacy interface is only available in development mode. 
              The new HRMS API endpoints are available at <a href="/api/health">/api/health</a>.
          </div>
          
          <div class="manual-entry">
              <h3>Enter Table Name Manually</h3>
              <p>If you know the table name, enter it below (try "Employee"):</p>
              <div class="input-group">
                  <input type="text" id="tableNameInput" placeholder="Enter table name..." value="Employee" />
                  <button onclick="viewTable()">View Table</button>
              </div>
          </div>
          
          <div class="table-list">
              <h3>Discovered Tables</h3>
      `;

      // Try to show discovered tables if available
      if (schema && schema.length > 0) {
        for (const table of schema) {
          const tableName = table.TABLE_NAME || table.Name || table.table_name;
          if (tableName && tableName !== '' && !tableName.startsWith('MSys')) {
            html += `
              <div class="table-item">
                  <span class="table-name">${tableName}</span>
                  <a href="/db/table/${encodeURIComponent(tableName)}" class="view-link">View Data</a>
              </div>
            `;
          }
        }
      } else {
        html += `<p>No tables could be automatically discovered. Use the manual entry above.</p>`;
      }

      html += `
          </div>
      </body>
      </html>
      `;

      res.send(html);
    } catch (error) {
      console.error('Database error:', error);
      
      // Fallback UI if schema discovery fails
      const fallbackHtml = `
      <!DOCTYPE html>
      <html>
      <head>
          <title>PGA Database Explorer</title>
          <style>
              body { font-family: Arial, sans-serif; margin: 40px; }
              .manual-entry { margin: 20px 0; padding: 15px; background-color: #e9ecef; border-radius: 5px; }
              .input-group { margin: 10px 0; }
              input[type="text"] { padding: 8px; margin-right: 10px; width: 200px; }
              button { padding: 8px 15px; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; }
              button:hover { background-color: #0056b3; }
              .error { color: #dc3545; margin: 10px 0; }
              .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0; }
          </style>
          <script>
              function viewTable() {
                  const tableName = document.getElementById('tableNameInput').value.trim();
                  if (tableName) {
                      window.location.href = '/db/table/' + encodeURIComponent(tableName);
                  } else {
                      alert('Please enter a table name');
                  }
              }
          </script>
      </head>
      <body>
          <h1>PGA Database Explorer (Legacy)</h1>
          
          <div class="warning">
              <strong>⚠️ Development Only:</strong> This legacy interface is only available in development mode.
          </div>
          
          <div class="error">
              <strong>Note:</strong> Could not automatically discover tables. Please enter table names manually.
          </div>
          
          <div class="manual-entry">
              <h3>Enter Table Name</h3>
              <p>Enter the name of the table you want to view (try "Employee"):</p>
              <div class="input-group">
                  <input type="text" id="tableNameInput" placeholder="Enter table name..." value="Employee" />
                  <button onclick="viewTable()">View Table</button>
              </div>
              <p><small>Common table names might include: Employee, Department, etc.</small></p>
          </div>
      </body>
      </html>
      `;
      
      res.send(fallbackHtml);
    }
  });

  app.get('/db/table/:tableName', async (req, res) => {
    try {
      const { tableName } = req.params;
      const data = await connection.query(`SELECT * FROM [${tableName}]`) as any[];
      
      if (!data || data.length === 0) {
        return res.send(`
          <!DOCTYPE html>
          <html>
          <head>
              <title>${tableName} - No Data</title>
              <style>
                  body { font-family: Arial, sans-serif; margin: 40px; }
                  .back-link { color: #007bff; text-decoration: none; }
                  .back-link:hover { text-decoration: underline; }
              </style>
          </head>
          <body>
              <h1>Table: ${tableName}</h1>
              <p>No data found in this table.</p>
              <a href="/db" class="back-link">← Back to Tables</a>
          </body>
          </html>
        `);
      }

      const columns = Object.keys(data[0]);
      
      let html = `
      <!DOCTYPE html>
      <html>
      <head>
          <title>${tableName} - Data</title>
          <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              table { border-collapse: collapse; width: 100%; margin: 20px 0; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; font-weight: bold; }
              tr:nth-child(even) { background-color: #f9f9f9; }
              .back-link { color: #007bff; text-decoration: none; margin-bottom: 20px; display: inline-block; }
              .back-link:hover { text-decoration: underline; }
              .record-count { color: #666; margin: 10px 0; }
          </style>
      </head>
      <body>
          <a href="/db" class="back-link">← Back to Tables</a>
          <h1>Table: ${tableName}</h1>
          <div class="record-count">Records found: ${data.length}</div>
          <table>
              <thead>
                  <tr>
      `;

      columns.forEach(column => {
        html += `<th>${column}</th>`;
      });

      html += `
                  </tr>
              </thead>
              <tbody>
      `;

      data.forEach((row: any) => {
        html += '<tr>';
        columns.forEach(column => {
          const value = row[column];
          const displayValue = value === null || value === undefined ? '' : String(value);
          html += `<td>${displayValue}</td>`;
        });
        html += '</tr>';
      });

      html += `
              </tbody>
          </table>
      </body>
      </html>
      `;

      res.send(html);
    } catch (error) {
      console.error('Database error:', error);
      res.status(500).json({ error: `Failed to retrieve data from table: ${req.params.tableName}` });
    }
  });
};