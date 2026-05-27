// Script to export the local MySQL database schema and data to database_schema.sql
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function exportDatabase() {
    console.log('🔄 Connecting to local database...');
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || 'password',
            database: process.env.DB_NAME || 'quiz_app',
            port: parseInt(process.env.DB_PORT || '3306')
        });
        console.log('✅ Connected successfully!');
    } catch (err) {
        console.error('❌ Failed to connect to local database:', err.message);
        console.log('💡 Make sure your local MySQL server is running.');
        process.exit(1);
    }

    const outputFilePath = path.join(__dirname, '..', 'database_schema.sql');
    let sqlDump = `-- Quiz App Database Dump\n-- Generated on ${new Date().toISOString()}\n\n`;
    sqlDump += `CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\`;\n`;
    sqlDump += `USE \`${process.env.DB_NAME}\`;\n\n`;

    try {
        // Get list of tables
        const [tables] = await connection.query('SHOW TABLES');
        const dbNameKey = `Tables_in_${process.env.DB_NAME}`;

        for (const tableRow of tables) {
            const tableName = tableRow[dbNameKey];
            console.log(`📦 Exporting table: ${tableName}`);

            // Get CREATE TABLE statement
            const [createRows] = await connection.query(`SHOW CREATE TABLE \`${tableName}\``);
            const createStatement = createRows[0]['Create Table'];
            sqlDump += `-- Table structure for table \`${tableName}\`\n`;
            sqlDump += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
            sqlDump += `${createStatement};\n\n`;

            // Get table data
            const [dataRows] = await connection.query(`SELECT * FROM \`${tableName}\``);
            if (dataRows.length > 0) {
                sqlDump += `-- Dumping data for table \`${tableName}\`\n`;
                
                // Format inserts in batches of 100 rows
                const batchSize = 100;
                for (let i = 0; i < dataRows.length; i += batchSize) {
                    const batch = dataRows.slice(i, i + batchSize);
                    const columns = Object.keys(batch[0]).map(col => `\`${col}\``).join(', ');
                    
                    const values = batch.map(row => {
                        const rowValues = Object.values(row).map(val => {
                            if (val === null) return 'NULL';
                            if (typeof val === 'number') return val;
                            if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
                            // Escape strings safely
                            const escaped = val.toString().replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                            return `'${escaped}'`;
                        }).join(', ');
                        return `(${rowValues})`;
                    }).join(',\n');

                    sqlDump += `INSERT INTO \`${tableName}\` (${columns}) VALUES\n${values};\n`;
                }
                sqlDump += '\n';
            }
        }

        fs.writeFileSync(outputFilePath, sqlDump, 'utf8');
        console.log(`\n🎉 Database exported successfully to: ${outputFilePath}`);
        console.log(`💡 You can open this file and copy its contents to your cloud database.`);
    } catch (err) {
        console.error('❌ Error during export:', err.message);
    } finally {
        await connection.end();
    }
}

exportDatabase();
