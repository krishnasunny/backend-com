const db = require('../config/database');
const logger = require('../utils/logger');

const getCategories = async (req, res) => {
  try {
    const query = `
      WITH RECURSIVE category_tree AS (
        -- Base case: get all parent categories
        SELECT 
          c.category_id,
          c.category_name,
          c.description,
          c.image_url,
          c.parent_id,
          c.created_at,
          1 as level,
          ARRAY[c.category_id] as path
        FROM categories c
        WHERE c.parent_id IS NULL

        UNION ALL

        -- Recursive case: get subcategories
        SELECT 
          c.category_id,
          c.category_name,
          c.description,
          c.image_url,
          c.parent_id,
          c.created_at,
          ct.level + 1,
          ct.path || c.category_id
        FROM categories c
        JOIN category_tree ct ON c.parent_id = ct.category_id
      )
      SELECT 
        category_id,
        category_name,
        description,
        image_url,
        parent_id,
        created_at,
        level,
        path
      FROM category_tree
      ORDER BY path;
    `;

    const { rows } = await db.query(query);

    // Transform flat structure into hierarchical
    const categoriesMap = new Map();
    const rootCategories = [];

    rows.forEach(row => {
      const category = {
        id: row.category_id,
        name: row.category_name,
        description: row.description,
        imageUrl: row.image_url,
        level: row.level,
        createdAt: row.created_at,
        subcategories: []
      };
      
      categoriesMap.set(category.id, category);
      
      if (row.parent_id === null) {
        rootCategories.push(category);
      } else {
        const parentCategory = categoriesMap.get(row.parent_id);
        if (parentCategory) {
          parentCategory.subcategories.push(category);
        }
      }
    });

    res.json(rootCategories);
  } catch (error) {
    logger.error('Error in getCategories:', error);
    res.status(500).json({ message: 'Error fetching categories' });
  }
};

const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        c1.category_id,
        c1.category_name,
        c1.description,
        c1.image_url,
        c1.parent_id,
        c1.created_at,
        p.category_name as parent_name,
        p.description as parent_description,
        (
          SELECT json_agg(json_build_object(
            'id', c2.category_id,
            'name', c2.category_name,
            'description', c2.description,
            'imageUrl', c2.image_url
          ))
          FROM categories c2
          WHERE c2.parent_id = c1.category_id
        ) as subcategories
      FROM categories c1
      LEFT JOIN categories p ON c1.parent_id = p.category_id
      WHERE c1.category_id = $1
    `;
    
    const { rows } = await db.query(query, [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    logger.error('Error in getCategoryById:', error);
    res.status(500).json({ message: 'Error fetching category' });
  }
};

const createCategory = async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    
    const { category_name, description, image_url, parent_id } = req.body;

    // If parent_id is provided, verify it exists
    if (parent_id) {
      const parentExists = await client.query(
        'SELECT category_id FROM categories WHERE category_id = $1',
        [parent_id]
      );

      if (parentExists.rows.length === 0) {
        return res.status(400).json({ message: 'Parent category not found' });
      }
    }

    const query = `
      INSERT INTO categories (category_name, description, image_url, parent_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const result = await client.query(query, [
      category_name,
      description,
      image_url,
      parent_id
    ]);

    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error in createCategory:', error);
    res.status(500).json({ message: 'Error creating category' });
  } finally {
    client.release();
  }
};

const updateCategory = async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { category_name, description, image_url, parent_id } = req.body;

    // Prevent category from being its own parent
    if (parent_id && parseInt(id) === parseInt(parent_id)) {
      return res.status(400).json({ message: 'Category cannot be its own parent' });
    }

    // If parent_id is provided, verify it exists
    if (parent_id) {
      const parentExists = await client.query(
        'SELECT category_id FROM categories WHERE category_id = $1',
        [parent_id]
      );

      if (parentExists.rows.length === 0) {
        return res.status(400).json({ message: 'Parent category not found' });
      }
    }

    const query = `
      UPDATE categories
      SET 
        category_name = COALESCE($1, category_name),
        description = COALESCE($2, description),
        image_url = COALESCE($3, image_url),
        parent_id = $4
      WHERE category_id = $5
      RETURNING *
    `;

    const result = await client.query(query, [
      category_name,
      description,
      image_url,
      parent_id,
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error in updateCategory:', error);
    res.status(500).json({ message: 'Error updating category' });
  } finally {
    client.release();
  }
};

const deleteCategory = async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;

    // Check if category has subcategories
    const hasSubcategories = await client.query(
      'SELECT EXISTS(SELECT 1 FROM categories WHERE parent_id = $1)',
      [id]
    );

    if (hasSubcategories.rows[0].exists) {
      return res.status(400).json({ 
        message: 'Cannot delete category with subcategories. Delete subcategories first.' 
      });
    }

    // Check if category is used in products
    const hasProducts = await client.query(
      'SELECT EXISTS(SELECT 1 FROM products WHERE category_id = $1)',
      [id]
    );

    if (hasProducts.rows[0].exists) {
      return res.status(400).json({ 
        message: 'Cannot delete category that has associated products' 
      });
    }

    const result = await client.query(
      'DELETE FROM categories WHERE category_id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }

    await client.query('COMMIT');
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error in deleteCategory:', error);
    res.status(500).json({ message: 'Error deleting category' });
  } finally {
    client.release();
  }
};

module.exports = {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
};