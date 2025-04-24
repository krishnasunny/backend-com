const db = require('../config/database');
const logger = require('../utils/logger');

const getSubcategories = async (req, res) => {
  try {
    const { category_id } = req.query;
    
    let query = `
      SELECT 
        s.subcategory_id,
        s.name,
        s.description,
        s.image_url,
        s.category_id,
        s.created_at,
        c.category_name as category_name
      FROM subcategories s
      JOIN categories c ON s.category_id = c.category_id
    `;
    
    const params = [];
    if (category_id) {
      query += ' WHERE s.category_id = $1';
      params.push(category_id);
    }
    
    query += ' ORDER BY s.created_at DESC';

    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    logger.error('Error in getSubcategories:', error);
    res.status(500).json({ message: 'Error fetching subcategories' });
  }
};

const getSubcategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        s.subcategory_id,
        s.name,
        s.description,
        s.image_url,
        s.category_id,
        s.created_at,
        c.category_name as category_name
      FROM subcategories s
      JOIN categories c ON s.category_id = c.category_id
      WHERE s.subcategory_id = $1
    `;
    
    const { rows } = await db.query(query, [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Subcategory not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    logger.error('Error in getSubcategoryById:', error);
    res.status(500).json({ message: 'Error fetching subcategory' });
  }
};

const createSubcategory = async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    
    const { name, description, image_url, category_id } = req.body;

    // Verify category exists
    const categoryExists = await client.query(
      'SELECT category_id FROM categories WHERE category_id = $1',
      [category_id]
    );

    if (categoryExists.rows.length === 0) {
      return res.status(400).json({ message: 'Category not found' });
    }

    // Check for duplicate name within the same category
    const duplicateCheck = await client.query(
      'SELECT subcategory_id FROM subcategories WHERE name = $1 AND category_id = $2',
      [name, category_id]
    );

    if (duplicateCheck.rows.length > 0) {
      return res.status(400).json({ 
        message: 'A subcategory with this name already exists in the selected category' 
      });
    }

    const query = `
      INSERT INTO subcategories (name, description, image_url, category_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const result = await client.query(query, [name, description, image_url, category_id]);

    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error in createSubcategory:', error);
    res.status(500).json({ message: 'Error creating subcategory' });
  } finally {
    client.release();
  }
};

const updateSubcategory = async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { name, description, image_url, category_id } = req.body;

    // If category_id is provided, verify it exists
    if (category_id) {
      const categoryExists = await client.query(
        'SELECT category_id FROM categories WHERE category_id = $1',
        [category_id]
      );

      if (categoryExists.rows.length === 0) {
        return res.status(400).json({ message: 'Category not found' });
      }
    }

    const query = `
      UPDATE subcategories
      SET 
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        image_url = COALESCE($3, image_url),
        category_id = COALESCE($4, category_id)
      WHERE subcategory_id = $5
      RETURNING *
    `;

    const result = await client.query(query, [
      name,
      description,
      image_url,
      category_id,
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Subcategory not found' });
    }

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error in updateSubcategory:', error);
    res.status(500).json({ message: 'Error updating subcategory' });
  } finally {
    client.release();
  }
};

const deleteSubcategory = async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;

    // Check if subcategory is used in products
    const hasProducts = await client.query(
      'SELECT EXISTS(SELECT 1 FROM products WHERE subcategory_id = $1)',
      [id]
    );

    if (hasProducts.rows[0].exists) {
      return res.status(400).json({ 
        message: 'Cannot delete subcategory that has associated products' 
      });
    }

    const result = await client.query(
      'DELETE FROM subcategories WHERE subcategory_id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Subcategory not found' });
    }

    await client.query('COMMIT');
    res.json({ message: 'Subcategory deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error in deleteSubcategory:', error);
    res.status(500).json({ message: 'Error deleting subcategory' });
  } finally {
    client.release();
  }
};

module.exports = {
  getSubcategories,
  getSubcategoryById,
  createSubcategory,
  updateSubcategory,
  deleteSubcategory
};