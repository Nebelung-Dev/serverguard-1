import { Pool } from "pg";
import crypto from 'crypto';

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

export async function checkIp(ip) {
    const client = await pool.connect();
    try {
        const hashed = crypto.createHash('sha256').update(process.env.SALT + ip).digest('base64');
        const res = await client.query(`SELECT id FROM userdata WHERE ip = '${hashed}';`);
        if (res.rowCount !== 0) {
            return res.rows[0].id;
        }
        return false;
    } catch (err) {
        console.error(err);
    } finally {
        client.release();
    }
};

export async function setData(id, ip) {
    const client = await pool.connect();
    try {
        const hashedIp = crypto.createHash('sha256').update(process.env.SALT + ip).digest('base64');
        await client.query(`INSERT INTO userdata VALUES('${id}', '${hashedIp}');`);
    } catch (err) {
        console.error(err);
    } finally {
        client.release();
    }
};

export async function deleteData(id) {
    const client = await pool.connect();
    try {
        await client.query(`DELETE FROM userdata WHERE id='${id}';`);
    } catch (err) {
        console.error(err);
    } finally {
        client.release();
    }
};

export async function pendingDeletion(id) {
    const client = await pool.connect();
    try {
        await client.query(`INSERT INTO pending VALUES('${id}');`);
    } catch (err) {
        console.error(err);
    } finally {
        client.release();
    }
}

export async function deletePending() {
    const client = await pool.connect();
    try {
        const result = await client.query({
            rowMode: 'array',
            // text: 'DELETE FROM userdata WHERE id IN (select id from pending);'
            text: 'SELECT id FROM pending;'
        });
        let quereyString = '';
        if (result.rowCount === 0) {
            return [[0]];
        }
        result.rows.forEach(row => {
            quereyString += `'${row[0]}',`;
        });
        quereyString = quereyString.slice(0, -1);
        await client.query(`DELETE FROM userdata WHERE id IN (${quereyString});`);
        await client.query(`TRUNCATE table pending;`);
        return result.rows;
    } catch (err) {
        console.log(err);
    }
    finally {
        client.release();
    }
}

export async function cancelPending(id) {
    const client = await pool.connect();
    try {
        await client.query(`DELETE FROM pending WHERE id='${id}'`);
    }
    catch (err) {
        console.log(err);
    }
    finally {
        client.release();
    }
}