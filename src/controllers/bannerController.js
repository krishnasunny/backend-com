const db = require('../config/database');
const logger = require('../utils/logger');

const getBanners = async (req, res) => {
  try {
    const { type } = req.query;
    
    let query = `
      SELECT *
      FROM banners
      WHERE 
        start_date <= CURRENT_TIMESTAMP
        AND end_date >= CURRENT_TIMESTAMP
    `;

    // is_active = true AND 

    const queryParams = [];
    if (type) {
      queryParams.push(type);
      query += ` AND banner_type = $1`;
    }

    query += ` ORDER BY created_at DESC`;

    const { rows } = await db.query(query, queryParams);
    res.json(rows);
  } catch (error) {
    logger.error('Error in getBanners:', error);
    res.status(500).json({ message: 'Error fetching banners' });
  }
};

const getBannerById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT *
      FROM banners
      WHERE banner_id = $1
    `;
    
    const { rows } = await db.query(query, [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Banner not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    logger.error('Error in getBannerById:', error);
    res.status(500).json({ message: 'Error fetching banner' });
  }
};

const createBanner = async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    
    const {
      title,
      description,
      image_url,
      redirect_url,
      is_active,
      start_date,
      end_date,
      banner_type
    } = req.body;

    const query = `
      INSERT INTO banners (
        title,
        description,
        image_url,
        redirect_url,
        is_active,
        start_date,
        end_date,
        banner_type
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const result = await client.query(query, [
      title,
      description,
      image_url,
      redirect_url,
      is_active,
      start_date,
      end_date,
      banner_type
    ]);

    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error in createBanner:', error);
    res.status(500).json({ message: 'Error creating banner' });
  } finally {
    client.release();
  }
};

const updateBanner = async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const {
      title,
      description,
      image_url,
      redirect_url,
      is_active,
      start_date,
      end_date,
      banner_type
    } = req.body;

    const query = `
      UPDATE banners
      SET 
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        image_url = COALESCE($3, image_url),
        redirect_url = COALESCE($4, redirect_url),
        is_active = COALESCE($5, is_active),
        start_date = COALESCE($6, start_date),
        end_date = COALESCE($7, end_date),
        banner_type = COALESCE($8, banner_type),
        updated_at = CURRENT_TIMESTAMP
      WHERE banner_id = $9
      RETURNING *
    `;

    const result = await client.query(query, [
      title,
      description,
      image_url,
      redirect_url,
      is_active,
      start_date,
      end_date,
      banner_type,
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Banner not found' });
    }

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error in updateBanner:', error);
    res.status(500).json({ message: 'Error updating banner' });
  } finally {
    client.release();
  }
};

const deleteBanner = async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;

    const result = await client.query(
      'DELETE FROM banners WHERE banner_id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Banner not found' });
    }

    await client.query('COMMIT');
    res.json({ message: 'Banner deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error in deleteBanner:', error);
    res.status(500).json({ message: 'Error deleting banner' });
  } finally {
    client.release();
  }
};

module.exports = {
  getBanners,
  getBannerById,
  createBanner,
  updateBanner,
  deleteBanner
};