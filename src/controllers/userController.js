const db = require('../config/database');
const { getPagination, getPagingData } = require('../utils/pagination');
const logger = require('../utils/logger');

const getUsers = async (req, res) => {
  try {
    const { page, size, search } = req.query;
    const { limit, offset } = getPagination(page, size);

    const searchCondition = search ? 
      `WHERE first_name ILIKE $3 OR last_name ILIKE $3 OR email ILIKE $3` : '';

    const query = `
      SELECT user_id, first_name, last_name, email, role, created_at
      FROM users
      ${searchCondition}
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const params = search ? 
      [limit, offset, `%${search}%`] : 
      [limit, offset];

    const { rows, rowCount } = await db.query(query, params);
    
    const response = getPagingData({
      count: rowCount,
      rows: rows
    }, page, limit);

    res.json(response);
  } catch (error) {
    logger.error('Error in getUsers:', error);
    res.status(500).json({ message: 'Error fetching users' });
  }
};

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('User ID:', id);
    
    const query = `
      SELECT user_id, first_name, last_name, email, role, created_at
      FROM users
      WHERE user_id = $1
    `;
    
    const { rows } = await db.query(query, [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    logger.error('Error in getUserById:', error);
    res.status(500).json({ message: 'Error fetching user' });
  }
};

const createUser = async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    
    const { first_name, last_name, email, password, role } = req.body;
    
    // Check if user exists
    const userExists = await client.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const query = `
      INSERT INTO users (first_name, last_name, email, password_hash, role)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING user_id, email, role
    `;
    
    const result = await client.query(query, [
      first_name,
      last_name,
      email,
      password,
      role
    ]);

    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error in createUser:', error);
    res.status(500).json({ message: 'Error creating user' });
  } finally {
    client.release();
  }
};

const updateUser = async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { first_name, last_name, email,role } = req.body;
    
    const query = `
      UPDATE users
      SET first_name = $1, last_name = $2, email = $3, role=$4
      WHERE user_id = $5
      RETURNING user_id, first_name, last_name, email, role
    `;
    
    const result = await client.query(query, [first_name, last_name, email,role, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error in updateUser:', error);
    res.status(500).json({ message: 'Error updating user' });
  } finally {
    client.release();
  }
};

const deleteUser = async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    
    const result = await client.query(
      'DELETE FROM users WHERE user_id = $1 RETURNING user_id',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    await client.query('COMMIT');
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error in deleteUser:', error);
    res.status(500).json({ message: 'Error deleting user' });
  } finally {
    client.release();
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
};