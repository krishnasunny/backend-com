const pool = require('../config/db');


const getProducts = async (req, res) => {
  try {
    const { subcategory_name, search, category_id, pincode } = req.query;
    
    let query = `
      SELECT 
        p.*,
        v.store_name,
        c.category_name,
        s.name as subcategory_name,
        COALESCE(
          array_agg(DISTINCT 
            CASE 
              WHEN pv.variant_id IS NOT NULL THEN 
                jsonb_build_object(
                  'variant_id', pv.variant_id,
                  'variant_name', pv.variant_name,
                  'variant_price', pv.variant_price,
                  'stock_quantity', pv.stock_quantity,
                  'sku', pv.sku
                )
            END
          ) FILTER (WHERE pv.variant_id IS NOT NULL),
          '{}'
        ) AS variants,
        COALESCE(
          array_agg(DISTINCT 
            CASE 
              WHEN pi.image_id IS NOT NULL THEN 
                jsonb_build_object(
                  'image_id', pi.image_id,
                  'image_url', pi.image_url,
                  'is_primary', pi.is_primary
                )
            END
          ) FILTER (WHERE pi.image_id IS NOT NULL),
          '{}'
        ) AS images
      FROM products p
      JOIN vendors v ON p.vendor_id = v.vendor_id
      JOIN categories c ON p.category_id = c.category_id
      JOIN subcategories s ON p.subcategory_id = s.subcategory_id
      LEFT JOIN product_variants pv ON p.product_id = pv.product_id
      LEFT JOIN product_images pi ON p.product_id = pi.product_id
      WHERE v.status = 'active'
    `;

    const queryParams = [];
    let paramCount = 0;

    if (pincode) {
      paramCount++;
      queryParams.push(pincode);
      query += ` AND v.pincode = $${paramCount}`;
    }

    if (category_id) {
      paramCount++;
      queryParams.push(category_id);
      query += ` AND p.category_id = $${paramCount}`;
    }

    if (search) {
      paramCount++;
      queryParams.push(`%${search}%`);
      query += ` AND (p.product_name ILIKE $${paramCount} OR p.description ILIKE $${paramCount})`;
    }

    if (subcategory_name && !search) {
      paramCount++;
      queryParams.push(subcategory_name);
      query += ` AND s.name = $${paramCount}`;
    }

    query += `
      GROUP BY 
        p.product_id, 
        v.store_name, 
        c.category_name,
        s.name
      ORDER BY p.created_at DESC
    `;

    const result = await pool.query(query, queryParams);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// const getProducts = async (req, res) => {
//   try {
//     const { subcategory_name, search, category_id } = req.query;
    
//     let query = `
//       SELECT 
//         p.*,
//         v.store_name,
//         c.category_name,
//         s.name as subcategory_name,
//         COALESCE(
//           array_agg(DISTINCT 
//             CASE 
//               WHEN pv.variant_id IS NOT NULL THEN 
//                 jsonb_build_object(
//                   'variant_id', pv.variant_id,
//                   'variant_name', pv.variant_name,
//                   'variant_price', pv.variant_price,
//                   'stock_quantity', pv.stock_quantity,
//                   'sku', pv.sku
//                 )
//             END
//           ) FILTER (WHERE pv.variant_id IS NOT NULL),
//           '{}'
//         ) AS variants,
//         COALESCE(
//           array_agg(DISTINCT 
//             CASE 
//               WHEN pi.image_id IS NOT NULL THEN 
//                 jsonb_build_object(
//                   'image_id', pi.image_id,
//                   'image_url', pi.image_url,
//                   'is_primary', pi.is_primary
//                 )
//             END
//           ) FILTER (WHERE pi.image_id IS NOT NULL),
//           '{}'
//         ) AS images
//       FROM products p
//       LEFT JOIN vendors v ON p.vendor_id = v.vendor_id
//       LEFT JOIN categories c ON p.category_id = c.category_id
//       LEFT JOIN subcategories s ON p.subcategory_id = s.subcategory_id
//       LEFT JOIN product_variants pv ON p.product_id = pv.product_id
//       LEFT JOIN product_images pi ON p.product_id = pi.product_id
//       WHERE 1=1
//     `;

//     const queryParams = [];
//     let paramCount = 0;

//     // First check category_id
//     if (category_id) {
//       paramCount++;
//       queryParams.push(category_id);
//       query += ` AND p.category_id = $${paramCount}`;
//     }

//     // Then check search term
//     if (search) {
//       paramCount++;
//       queryParams.push(`%${search}%`);
//       query += ` AND (p.product_name ILIKE $${paramCount} OR p.description ILIKE $${paramCount})`;
//     }

//     // Finally filter by subcategory if specified
//     if (subcategory_name && !search) {
//       paramCount++;
//       queryParams.push(subcategory_name);
//       query += ` AND s.name = $${paramCount}`;
//     }

//     query += `
//       GROUP BY 
//         p.product_id, 
//         v.store_name, 
//         c.category_name,
//         s.name
//       ORDER BY p.created_at DESC
//     `;

//     const result = await pool.query(query, queryParams);
//     res.json(result.rows);
//   } catch (error) {
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// };

const createProduct = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { 
      vendor_id,
      category_id,
      subcategory_id,
      product_name,
      description,
      base_price,
      sku,
      variants,
      images
    } = req.body;

    // Verify category exists if provided
    if (category_id) {
      const categoryExists = await client.query(
        'SELECT category_id FROM categories WHERE category_id = $1',
        [category_id]
      );

      if (categoryExists.rows.length === 0) {
        return res.status(400).json({ message: 'Category not found' });
      }
    }

    // Create product
    const productResult = await client.query(
      `INSERT INTO products (
        vendor_id, 
        category_id,
        subcategory_id,
        product_name, 
        description, 
        base_price, 
        sku
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7) 
      RETURNING product_id`,
      [
        vendor_id, 
        category_id,
        subcategory_id || null,
        product_name, 
        description, 
        base_price, 
        sku
      ]
    );

    const product_id = productResult.rows[0].product_id;

    // Add variants
    if (variants && variants.length > 0) {
      for (const variant of variants) {
        await client.query(
          `INSERT INTO product_variants (
            product_id, 
            variant_name, 
            variant_price, 
            stock_quantity, 
            sku
          )
          VALUES ($1, $2, $3, $4, $5)`,
          [
            product_id, 
            variant.name, 
            variant.price, 
            variant.stock_quantity, 
            variant.sku
          ]
        );
      }
    }

    // Add images
    if (images && images.length > 0) {
      for (const image of images) {
        await client.query(
          `INSERT INTO product_images (
            product_id, 
            image_url, 
            is_primary
          )
          VALUES ($1, $2, $3)`,
          [product_id, image.url, image.is_primary]
        );
      }
    }

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Product created successfully',
      product_id
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Server error', error: error.message });
  } finally {
    client.release();
  }
};

const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // First get the basic product info
    const productQuery = await pool.query(
      `SELECT 
        p.*,
        v.store_name,
        v.user_id,
        c.category_name,
        s.name as subcategory_name
      FROM products p
      LEFT JOIN vendors v ON p.vendor_id = v.vendor_id
      LEFT JOIN categories c ON p.category_id = c.category_id
      LEFT JOIN subcategories s ON p.subcategory_id = s.subcategory_id
      WHERE p.product_id = $1`,
      [id]
    );

    if (productQuery.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const product = productQuery.rows[0];
    
    // Get variants for this product
    const variantsQuery = await pool.query(
      `SELECT 
        variant_id,
        variant_name,
        variant_price,
        stock_quantity,
        sku
      FROM product_variants
      WHERE product_id = $1`,
      [id]
    );
    
    // Get images for this product
    const imagesQuery = await pool.query(
      `SELECT 
        image_id,
        image_url,
        is_primary
      FROM product_images
      WHERE product_id = $1`,
      [id]
    );
    
    // Add variants and images to product
    product.variants = variantsQuery.rows;
    product.images = imagesQuery.rows;

    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getProductsByVendorId = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT 
        p.*,
        v.store_name,
        c.category_name,
        s.name as subcategory_name,
        COALESCE(
          array_agg(DISTINCT 
            CASE 
              WHEN pv.variant_id IS NOT NULL THEN 
                jsonb_build_object(
                  'variant_id', pv.variant_id,
                  'variant_name', pv.variant_name,
                  'variant_price', pv.variant_price,
                  'stock_quantity', pv.stock_quantity,
                  'sku', pv.sku
                )
            END
          ) FILTER (WHERE pv.variant_id IS NOT NULL),
          '{}'
        ) AS variants,
        COALESCE(
          array_agg(DISTINCT 
            CASE 
              WHEN pi.image_id IS NOT NULL THEN 
                jsonb_build_object(
                  'image_id', pi.image_id,
                  'image_url', pi.image_url,
                  'is_primary', pi.is_primary
                )
            END
          ) FILTER (WHERE pi.image_id IS NOT NULL),
          '{}'
        ) AS images
      FROM products p
      LEFT JOIN vendors v ON p.vendor_id = v.vendor_id
      LEFT JOIN categories c ON p.category_id = c.category_id
      LEFT JOIN subcategories s ON p.subcategory_id = s.subcategory_id
      LEFT JOIN product_variants pv ON p.product_id = pv.product_id
      LEFT JOIN product_images pi ON p.product_id = pi.product_id
      WHERE p.vendor_id = $1
      GROUP BY 
        p.product_id, 
        v.store_name, 
        c.category_name,
        s.name`,
      [id]
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const deleteProduct = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    
    // Start transaction
    await client.query('BEGIN');
    
    const productExists = await client.query(
      `SELECT p.product_id, p.vendor_id, v.user_id 
       FROM products p
       INNER JOIN vendors v ON p.vendor_id = v.vendor_id
       WHERE p.product_id = $1`,
      [id]
    );
    
    if (productExists.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // If user is vendor_admin, ensure they can only delete their own products
    if (req.user.role === 'vendor_admin') {
      if (productExists.rows[0].user_id !== req.user.userId) {
        return res.status(403).json({ message: 'Unauthorized to delete this product' });
      }
    }
    
    // Delete product images
    await client.query(
      'DELETE FROM product_images WHERE product_id = $1',
      [id]
    );
    
    // Delete product variants
    await client.query(
      'DELETE FROM product_variants WHERE product_id = $1',
      [id]
    );
    
    // Delete the product
    await client.query(
      'DELETE FROM products WHERE product_id = $1',
      [id]
    );
    
    // Commit transaction
    await client.query('COMMIT');
    
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    // Rollback transaction in case of error
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Server error', error: error.message });
  } finally {
    client.release();
  }
};

const updateProduct = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { 
      category_id,
      subcategory_id,
      product_name,
      description,
      base_price,
      sku,
      variants,
      images
    } = req.body;
    
    // Get current product info and check authorization
    const productQuery = await client.query(
      `SELECT p.product_id, p.vendor_id, v.user_id 
       FROM products p
       INNER JOIN vendors v ON p.vendor_id = v.vendor_id
       WHERE p.product_id = $1`,
      [id]
    );
    
    if (productQuery.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    const product = productQuery.rows[0];

    // Check authorization - vendor admins can only update their own products
    if (req.user.role === 'vendor_admin' && req.user.userId !== product.user_id) {
      return res.status(403).json({ message: 'Unauthorized to update this product' });
    }
    
    // Verify category exists if provided
    if (category_id) {
      const categoryExists = await client.query(
        'SELECT category_id FROM categories WHERE category_id = $1',
        [category_id]
      );

      if (categoryExists.rows.length === 0) {
        return res.status(400).json({ message: 'Category not found' });
      }
    }

    // Update product basic info
    const updateFields = [];
    const updateValues = [];
    let valueCounter = 1;
    
    if (category_id !== undefined) {
      updateFields.push(`category_id = $${valueCounter}`);
      updateValues.push(category_id);
      valueCounter++;
    }
    
    if (subcategory_id !== undefined) {
      updateFields.push(`subcategory_id = $${valueCounter}`);
      updateValues.push(subcategory_id || null);
      valueCounter++;
    }
    
    if (product_name) {
      updateFields.push(`product_name = $${valueCounter}`);
      updateValues.push(product_name);
      valueCounter++;
    }
    
    if (description) {
      updateFields.push(`description = $${valueCounter}`);
      updateValues.push(description);
      valueCounter++;
    }
    
    if (base_price !== undefined) {
      updateFields.push(`base_price = $${valueCounter}`);
      updateValues.push(base_price);
      valueCounter++;
    }
    
    if (sku) {
      updateFields.push(`sku = $${valueCounter}`);
      updateValues.push(sku);
      valueCounter++;
    }
    
    if (updateFields.length > 0) {
      updateValues.push(id);
      
      await client.query(
        `UPDATE products 
         SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
         WHERE product_id = $${valueCounter}`,
        updateValues
      );
    }
    
    // Handle variants update
    if (variants && Array.isArray(variants)) {
      const existingVariantsResult = await client.query(
        'SELECT variant_id FROM product_variants WHERE product_id = $1',
        [id]
      );
      const existingVariantIds = existingVariantsResult.rows.map(row => row.variant_id);
      const variantIdsToKeep = [];
      
      for (const variant of variants) {
        if (variant.variant_id && existingVariantIds.includes(Number(variant.variant_id))) {
          await client.query(
            `UPDATE product_variants 
             SET variant_name = $1, 
                 variant_price = $2, 
                 stock_quantity = $3, 
                 sku = $4,
                 updated_at = CURRENT_TIMESTAMP
             WHERE variant_id = $5 AND product_id = $6`,
            [
              variant.name, 
              variant.price, 
              variant.stock_quantity, 
              variant.sku,
              variant.variant_id,
              id
            ]
          );
          
          variantIdsToKeep.push(Number(variant.variant_id));
        } else if (!variant.variant_id) {
          await client.query(
            `INSERT INTO product_variants (
              product_id, 
              variant_name, 
              variant_price, 
              stock_quantity, 
              sku
            )
            VALUES ($1, $2, $3, $4, $5)`,
            [
              id, 
              variant.name, 
              variant.price, 
              variant.stock_quantity, 
              variant.sku
            ]
          );
        }
      }
      
      const variantsToDelete = existingVariantIds.filter(id => !variantIdsToKeep.includes(id));
      
      if (variantsToDelete.length > 0) {
        const placeholders = variantsToDelete.map((_, idx) => `$${idx + 1}`).join(',');
        await client.query(
          `DELETE FROM product_variants WHERE variant_id IN (${placeholders})`,
          variantsToDelete
        );
      }
    }
    
    // Handle images update
    if (images && Array.isArray(images)) {
      const existingImagesResult = await client.query(
        'SELECT image_id FROM product_images WHERE product_id = $1',
        [id]
      );
      const existingImageIds = existingImagesResult.rows.map(row => row.image_id);
      const imageIdsToKeep = [];
      
      for (const image of images) {
        if (image.image_id && existingImageIds.includes(Number(image.image_id))) {
          await client.query(
            `UPDATE product_images 
             SET image_url = $1, 
                 is_primary = $2,
                 updated_at = CURRENT_TIMESTAMP
             WHERE image_id = $3 AND product_id = $4`,
            [
              image.url, 
              image.is_primary,
              image.image_id,
              id
            ]
          );
          
          imageIdsToKeep.push(Number(image.image_id));
        } else if (!image.image_id) {
          await client.query(
            `INSERT INTO product_images (
              product_id, 
              image_url, 
              is_primary
            )
            VALUES ($1, $2, $3)`,
            [id, image.url, image.is_primary]
          );
        }
      }
      
      const imagesToDelete = existingImageIds.filter(id => !imageIdsToKeep.includes(id));
      
      if (imagesToDelete.length > 0) {
        const placeholders = imagesToDelete.map((_, idx) => `$${idx + 1}`).join(',');
        await client.query(
          `DELETE FROM product_images WHERE image_id IN (${placeholders})`,
          imagesToDelete
        );
      }
    }
    
    await client.query('COMMIT');
    
    res.json({
      message: 'Product updated successfully',
      product_id: id
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in updateProduct:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  } finally {
    client.release();
  }
};

module.exports = {
  createProduct,
  getProducts,
  deleteProduct,
  updateProduct,
  getProductById,
  getProductsByVendorId
};


// const pool = require('../config/db');

// const createProduct = async (req, res) => {
//   const client = await pool.connect();
//   try {
//     await client.query('BEGIN');

//     const { 
//       vendor_id,
//       category_id,
//       subcategory_id,
//       product_name,
//       description,
//       base_price,
//       sku,
//       variants,
//       images
//     } = req.body;

//     // Verify category exists if provided
//     if (category_id) {
//       const categoryExists = await client.query(
//         'SELECT category_id FROM categories WHERE category_id = $1',
//         [category_id]
//       );

//       if (categoryExists.rows.length === 0) {
//         return res.status(400).json({ message: 'Category not found' });
//       }
//     }

//     // Create product
//     const productResult = await client.query(
//       `INSERT INTO products (
//         vendor_id, 
//         category_id,
//         subcategory_id,
//         product_name, 
//         description, 
//         base_price, 
//         sku
//       )
//       VALUES ($1, $2, $3, $4, $5, $6, $7) 
//       RETURNING product_id`,
//       [
//         vendor_id, 
//         category_id,
//         subcategory_id || null,
//         product_name, 
//         description, 
//         base_price, 
//         sku
//       ]
//     );

//     const product_id = productResult.rows[0].product_id;

//     // Add variants
//     if (variants && variants.length > 0) {
//       for (const variant of variants) {
//         await client.query(
//           `INSERT INTO product_variants (
//             product_id, 
//             variant_name, 
//             variant_price, 
//             stock_quantity, 
//             sku
//           )
//           VALUES ($1, $2, $3, $4, $5)`,
//           [
//             product_id, 
//             variant.name, 
//             variant.price, 
//             variant.stock_quantity, 
//             variant.sku
//           ]
//         );
//       }
//     }

//     // Add images
//     if (images && images.length > 0) {
//       for (const image of images) {
//         await client.query(
//           `INSERT INTO product_images (
//             product_id, 
//             image_url, 
//             is_primary
//           )
//           VALUES ($1, $2, $3)`,
//           [product_id, image.url, image.is_primary]
//         );
//       }
//     }

//     await client.query('COMMIT');

//     res.status(201).json({
//       message: 'Product created successfully',
//       product_id
//     });
//   } catch (error) {
//     await client.query('ROLLBACK');
//     res.status(500).json({ message: 'Server error', error: error.message });
//   } finally {
//     client.release();
//   }
// };

// const getProductById = async (req, res) => {
//   try {
//     const { id } = req.params;
    
//     // First get the basic product info
//     const productQuery = await pool.query(
//       `SELECT 
//         p.*,
//         v.store_name,
//         v.user_id,
//         c.category_name,
//         s.name as subcategory_name
//       FROM products p
//       LEFT JOIN vendors v ON p.vendor_id = v.vendor_id
//       LEFT JOIN categories c ON p.category_id = c.category_id
//       LEFT JOIN subcategories s ON p.subcategory_id = s.subcategory_id
//       WHERE p.product_id = $1`,
//       [id]
//     );

//     if (productQuery.rows.length === 0) {
//       return res.status(404).json({ message: 'Product not found' });
//     }

//     const product = productQuery.rows[0];
    
//     // Get variants for this product
//     const variantsQuery = await pool.query(
//       `SELECT 
//         variant_id,
//         variant_name,
//         variant_price,
//         stock_quantity,
//         sku
//       FROM product_variants
//       WHERE product_id = $1`,
//       [id]
//     );
    
//     // Get images for this product
//     const imagesQuery = await pool.query(
//       `SELECT 
//         image_id,
//         image_url,
//         is_primary
//       FROM product_images
//       WHERE product_id = $1`,
//       [id]
//     );
    
//     // Add variants and images to product
//     product.variants = variantsQuery.rows;
//     product.images = imagesQuery.rows;

//     res.json(product);
//   } catch (error) {
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// };

// const getProducts = async (req, res) => {
//   try {
//     const { subcategory_name } = req.query;
    
//     let query = `
//       SELECT 
//         p.*,
//         v.store_name,
//         c.category_name,
//         s.name as subcategory_name,
//         COALESCE(
//           array_agg(DISTINCT 
//             CASE 
//               WHEN pv.variant_id IS NOT NULL THEN 
//                 jsonb_build_object(
//                   'variant_id', pv.variant_id,
//                   'variant_name', pv.variant_name,
//                   'variant_price', pv.variant_price,
//                   'stock_quantity', pv.stock_quantity,
//                   'sku', pv.sku
//                 )
//             END
//           ) FILTER (WHERE pv.variant_id IS NOT NULL),
//           '{}'
//         ) AS variants,
//         COALESCE(
//           array_agg(DISTINCT 
//             CASE 
//               WHEN pi.image_id IS NOT NULL THEN 
//                 jsonb_build_object(
//                   'image_id', pi.image_id,
//                   'image_url', pi.image_url,
//                   'is_primary', pi.is_primary
//                 )
//             END
//           ) FILTER (WHERE pi.image_id IS NOT NULL),
//           '{}'
//         ) AS images
//       FROM products p
//       LEFT JOIN vendors v ON p.vendor_id = v.vendor_id
//       LEFT JOIN categories c ON p.category_id = c.category_id
//       LEFT JOIN subcategories s ON p.subcategory_id = s.subcategory_id
//       LEFT JOIN product_variants pv ON p.product_id = pv.product_id
//       LEFT JOIN product_images pi ON p.product_id = pi.product_id
//     `;

//     const queryParams = [];
//     if (subcategory_name) {
//       queryParams.push(subcategory_name);
//       query += ` WHERE s.name = $1`;
//     }

//     query += `
//       GROUP BY 
//         p.product_id, 
//         v.store_name, 
//         c.category_name,
//         s.name
//       ORDER BY p.created_at DESC
//     `;

//     const result = await pool.query(query, queryParams);
//     res.json(result.rows);
//   } catch (error) {
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// };

// const getProductsByVendorId = async (req, res) => {
//   const { id } = req.params;

//   try {
//     const result = await pool.query(
//       `SELECT 
//         p.*,
//         v.store_name,
//         c.category_name,
//         s.name as subcategory_name,
//         COALESCE(
//           array_agg(DISTINCT 
//             CASE 
//               WHEN pv.variant_id IS NOT NULL THEN 
//                 jsonb_build_object(
//                   'variant_id', pv.variant_id,
//                   'variant_name', pv.variant_name,
//                   'variant_price', pv.variant_price,
//                   'stock_quantity', pv.stock_quantity,
//                   'sku', pv.sku
//                 )
//             END
//           ) FILTER (WHERE pv.variant_id IS NOT NULL),
//           '{}'
//         ) AS variants,
//         COALESCE(
//           array_agg(DISTINCT 
//             CASE 
//               WHEN pi.image_id IS NOT NULL THEN 
//                 jsonb_build_object(
//                   'image_id', pi.image_id,
//                   'image_url', pi.image_url,
//                   'is_primary', pi.is_primary
//                 )
//             END
//           ) FILTER (WHERE pi.image_id IS NOT NULL),
//           '{}'
//         ) AS images
//       FROM products p
//       LEFT JOIN vendors v ON p.vendor_id = v.vendor_id
//       LEFT JOIN categories c ON p.category_id = c.category_id
//       LEFT JOIN subcategories s ON p.subcategory_id = s.subcategory_id
//       LEFT JOIN product_variants pv ON p.product_id = pv.product_id
//       LEFT JOIN product_images pi ON p.product_id = pi.product_id
//       WHERE p.vendor_id = $1
//       GROUP BY 
//         p.product_id, 
//         v.store_name, 
//         c.category_name,
//         s.name`,
//       [id]
//     );

//     res.json(result.rows);
//   } catch (error) {
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// };

// const deleteProduct = async (req, res) => {
//   const client = await pool.connect();
//   try {
//     const { id } = req.params;
    
//     // Start transaction
//     await client.query('BEGIN');
    
//     const productExists = await client.query(
//       `SELECT p.product_id, p.vendor_id, v.user_id 
//        FROM products p
//        INNER JOIN vendors v ON p.vendor_id = v.vendor_id
//        WHERE p.product_id = $1`,
//       [id]
//     );
    
//     if (productExists.rows.length === 0) {
//       return res.status(404).json({ message: 'Product not found' });
//     }
    
//     // If user is vendor_admin, ensure they can only delete their own products
//     if (req.user.role === 'vendor_admin') {
//       if (productExists.rows[0].user_id !== req.user.userId) {
//         return res.status(403).json({ message: 'Unauthorized to delete this product' });
//       }
//     }
    
//     // Delete product images
//     await client.query(
//       'DELETE FROM product_images WHERE product_id = $1',
//       [id]
//     );
    
//     // Delete product variants
//     await client.query(
//       'DELETE FROM product_variants WHERE product_id = $1',
//       [id]
//     );
    
//     // Delete the product
//     await client.query(
//       'DELETE FROM products WHERE product_id = $1',
//       [id]
//     );
    
//     // Commit transaction
//     await client.query('COMMIT');
    
//     res.json({ message: 'Product deleted successfully' });
//   } catch (error) {
//     // Rollback transaction in case of error
//     await client.query('ROLLBACK');
//     res.status(500).json({ message: 'Server error', error: error.message });
//   } finally {
//     client.release();
//   }
// };

// const updateProduct = async (req, res) => {
//   const client = await pool.connect();
//   try {
//     await client.query('BEGIN');
    
//     const { id } = req.params;
//     const { 
//       category_id,
//       subcategory_id,
//       product_name,
//       description,
//       base_price,
//       sku,
//       variants,
//       images
//     } = req.body;
    
//     // Get current product info and check authorization
//     const productQuery = await client.query(
//       `SELECT p.product_id, p.vendor_id, v.user_id 
//        FROM products p
//        INNER JOIN vendors v ON p.vendor_id = v.vendor_id
//        WHERE p.product_id = $1`,
//       [id]
//     );
    
//     if (productQuery.rows.length === 0) {
//       return res.status(404).json({ message: 'Product not found' });
//     }
    
//     const product = productQuery.rows[0];

//     // Check authorization - vendor admins can only update their own products
//     if (req.user.role === 'vendor_admin' && req.user.userId !== product.user_id) {
//       return res.status(403).json({ message: 'Unauthorized to update this product' });
//     }
    
//     // Verify category exists if provided
//     if (category_id) {
//       const categoryExists = await client.query(
//         'SELECT category_id FROM categories WHERE category_id = $1',
//         [category_id]
//       );

//       if (categoryExists.rows.length === 0) {
//         return res.status(400).json({ message: 'Category not found' });
//       }
//     }

//     // Update product basic info
//     const updateFields = [];
//     const updateValues = [];
//     let valueCounter = 1;
    
//     if (category_id !== undefined) {
//       updateFields.push(`category_id = $${valueCounter}`);
//       updateValues.push(category_id);
//       valueCounter++;
//     }
    
//     if (subcategory_id !== undefined) {
//       updateFields.push(`subcategory_id = $${valueCounter}`);
//       updateValues.push(subcategory_id || null);
//       valueCounter++;
//     }
    
//     if (product_name) {
//       updateFields.push(`product_name = $${valueCounter}`);
//       updateValues.push(product_name);
//       valueCounter++;
//     }
    
//     if (description) {
//       updateFields.push(`description = $${valueCounter}`);
//       updateValues.push(description);
//       valueCounter++;
//     }
    
//     if (base_price !== undefined) {
//       updateFields.push(`base_price = $${valueCounter}`);
//       updateValues.push(base_price);
//       valueCounter++;
//     }
    
//     if (sku) {
//       updateFields.push(`sku = $${valueCounter}`);
//       updateValues.push(sku);
//       valueCounter++;
//     }
    
//     if (updateFields.length > 0) {
//       updateValues.push(id);
      
//       await client.query(
//         `UPDATE products 
//          SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
//          WHERE product_id = $${valueCounter}`,
//         updateValues
//       );
//     }
    
//     // Handle variants update
//     if (variants && Array.isArray(variants)) {
//       const existingVariantsResult = await client.query(
//         'SELECT variant_id FROM product_variants WHERE product_id = $1',
//         [id]
//       );
//       const existingVariantIds = existingVariantsResult.rows.map(row => row.variant_id);
//       const variantIdsToKeep = [];
      
//       for (const variant of variants) {
//         if (variant.variant_id && existingVariantIds.includes(Number(variant.variant_id))) {
//           await client.query(
//             `UPDATE product_variants 
//              SET variant_name = $1, 
//                  variant_price = $2, 
//                  stock_quantity = $3, 
//                  sku = $4,
//                  updated_at = CURRENT_TIMESTAMP
//              WHERE variant_id = $5 AND product_id = $6`,
//             [
//               variant.name, 
//               variant.price, 
//               variant.stock_quantity, 
//               variant.sku,
//               variant.variant_id,
//               id
//             ]
//           );
          
//           variantIdsToKeep.push(Number(variant.variant_id));
//         } else if (!variant.variant_id) {
//           await client.query(
//             `INSERT INTO product_variants (
//               product_id, 
//               variant_name, 
//               variant_price, 
//               stock_quantity, 
//               sku
//             )
//             VALUES ($1, $2, $3, $4, $5)`,
//             [
//               id, 
//               variant.name, 
//               variant.price, 
//               variant.stock_quantity, 
//               variant.sku
//             ]
//           );
//         }
//       }
      
//       const variantsToDelete = existingVariantIds.filter(id => !variantIdsToKeep.includes(id));
      
//       if (variantsToDelete.length > 0) {
//         const placeholders = variantsToDelete.map((_, idx) => `$${idx + 1}`).join(',');
//         await client.query(
//           `DELETE FROM product_variants WHERE variant_id IN (${placeholders})`,
//           variantsToDelete
//         );
//       }
//     }
    
//     // Handle images update
//     if (images && Array.isArray(images)) {
//       const existingImagesResult = await client.query(
//         'SELECT image_id FROM product_images WHERE product_id = $1',
//         [id]
//       );
//       const existingImageIds = existingImagesResult.rows.map(row => row.image_id);
//       const imageIdsToKeep = [];
      
//       for (const image of images) {
//         if (image.image_id && existingImageIds.includes(Number(image.image_id))) {
//           await client.query(
//             `UPDATE product_images 
//              SET image_url = $1, 
//                  is_primary = $2,
//                  updated_at = CURRENT_TIMESTAMP
//              WHERE image_id = $3 AND product_id = $4`,
//             [
//               image.url, 
//               image.is_primary,
//               image.image_id,
//               id
//             ]
//           );
          
//           imageIdsToKeep.push(Number(image.image_id));
//         } else if (!image.image_id) {
//           await client.query(
//             `INSERT INTO product_images (
//               product_id, 
//               image_url, 
//               is_primary
//             )
//             VALUES ($1, $2, $3)`,
//             [id, image.url, image.is_primary]
//           );
//         }
//       }
      
//       const imagesToDelete = existingImageIds.filter(id => !imageIdsToKeep.includes(id));
      
//       if (imagesToDelete.length > 0) {
//         const placeholders = imagesToDelete.map((_, idx) => `$${idx + 1}`).join(',');
//         await client.query(
//           `DELETE FROM product_images WHERE image_id IN (${placeholders})`,
//           imagesToDelete
//         );
//       }
//     }
    
//     await client.query('COMMIT');
    
//     res.json({
//       message: 'Product updated successfully',
//       product_id: id
//     });
//   } catch (error) {
//     await client.query('ROLLBACK');
//     console.error('Error in updateProduct:', error);
//     res.status(500).json({ message: 'Server error', error: error.message });
//   } finally {
//     client.release();
//   }
// };

// module.exports = {
//   createProduct,
//   getProducts,
//   deleteProduct,
//   updateProduct,
//   getProductById,
//   getProductsByVendorId
// };






// const pool = require('../config/db');

// const createProduct = async (req, res) => {
//   const client = await pool.connect();
//   try {
//     await client.query('BEGIN');

//     const { 
//       vendor_id,
//       category_id,
//       subcategory_id,
//       product_name,
//       description,
//       base_price,
//       sku,
//       variants,
//       images
//     } = req.body;

//     // Verify category exists if provided
//     if (category_id) {
//       const categoryExists = await client.query(
//         'SELECT category_id FROM categories WHERE category_id = $1',
//         [category_id]
//       );

//       if (categoryExists.rows.length === 0) {
//         return res.status(400).json({ message: 'Category not found' });
//       }
//     }

//     // Create product
//     const productResult = await client.query(
//       `INSERT INTO products (
//         vendor_id, 
//         category_id,
//         subcategory_id,
//         product_name, 
//         description, 
//         base_price, 
//         sku
//       )
//       VALUES ($1, $2, $3, $4, $5, $6, $7) 
//       RETURNING product_id`,
//       [
//         vendor_id, 
//         category_id,
//         subcategory_id || null,
//         product_name, 
//         description, 
//         base_price, 
//         sku
//       ]
//     );

//     const product_id = productResult.rows[0].product_id;

//     // Add variants
//     if (variants && variants.length > 0) {
//       for (const variant of variants) {
//         await client.query(
//           `INSERT INTO product_variants (
//             product_id, 
//             variant_name, 
//             variant_price, 
//             stock_quantity, 
//             sku
//           )
//           VALUES ($1, $2, $3, $4, $5)`,
//           [
//             product_id, 
//             variant.name, 
//             variant.price, 
//             variant.stock_quantity, 
//             variant.sku
//           ]
//         );
//       }
//     }

//     // Add images
//     if (images && images.length > 0) {
//       for (const image of images) {
//         await client.query(
//           `INSERT INTO product_images (
//             product_id, 
//             image_url, 
//             is_primary
//           )
//           VALUES ($1, $2, $3)`,
//           [product_id, image.url, image.is_primary]
//         );
//       }
//     }

//     await client.query('COMMIT');

//     res.status(201).json({
//       message: 'Product created successfully',
//       product_id
//     });
//   } catch (error) {
//     await client.query('ROLLBACK');
//     res.status(500).json({ message: 'Server error', error: error.message });
//   } finally {
//     client.release();
//   }
// };

// const getProductById = async (req, res) => {
//   try {
//     const { id } = req.params;
    
//     // First get the basic product info
//     const productQuery = await pool.query(
//       `SELECT 
//         p.*,
//         v.store_name,
//         v.user_id,
//         c.category_name,
//         s.name as subcategory_name
//       FROM products p
//       LEFT JOIN vendors v ON p.vendor_id = v.vendor_id
//       LEFT JOIN categories c ON p.category_id = c.category_id
//       LEFT JOIN subcategories s ON p.subcategory_id = s.subcategory_id
//       WHERE p.product_id = $1`,
//       [id]
//     );

//     if (productQuery.rows.length === 0) {
//       return res.status(404).json({ message: 'Product not found' });
//     }

//     const product = productQuery.rows[0];
    
//     // Get variants for this product
//     const variantsQuery = await pool.query(
//       `SELECT 
//         variant_id,
//         variant_name,
//         variant_price,
//         stock_quantity,
//         sku
//       FROM product_variants
//       WHERE product_id = $1`,
//       [id]
//     );
    
//     // Get images for this product
//     const imagesQuery = await pool.query(
//       `SELECT 
//         image_id,
//         image_url,
//         is_primary
//       FROM product_images
//       WHERE product_id = $1`,
//       [id]
//     );
    
//     // Add variants and images to product
//     product.variants = variantsQuery.rows;
//     product.images = imagesQuery.rows;

//     res.json(product);
//   } catch (error) {
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// };

// const getProducts = async (req, res) => {
//   try {
//     const { subcategory_id } = req.query;
    
//     let query = `
//       SELECT 
//         p.*,
//         v.store_name,
//         c.category_name,
//         s.name as subcategory_name,
//         COALESCE(
//           array_agg(DISTINCT 
//             CASE 
//               WHEN pv.variant_id IS NOT NULL THEN 
//                 jsonb_build_object(
//                   'variant_id', pv.variant_id,
//                   'variant_name', pv.variant_name,
//                   'variant_price', pv.variant_price,
//                   'stock_quantity', pv.stock_quantity,
//                   'sku', pv.sku
//                 )
//             END
//           ) FILTER (WHERE pv.variant_id IS NOT NULL),
//           '{}'
//         ) AS variants,
//         COALESCE(
//           array_agg(DISTINCT 
//             CASE 
//               WHEN pi.image_id IS NOT NULL THEN 
//                 jsonb_build_object(
//                   'image_id', pi.image_id,
//                   'image_url', pi.image_url,
//                   'is_primary', pi.is_primary
//                 )
//             END
//           ) FILTER (WHERE pi.image_id IS NOT NULL),
//           '{}'
//         ) AS images
//       FROM products p
//       LEFT JOIN vendors v ON p.vendor_id = v.vendor_id
//       LEFT JOIN categories c ON p.category_id = c.category_id
//       LEFT JOIN subcategories s ON p.subcategory_id = s.subcategory_id
//       LEFT JOIN product_variants pv ON p.product_id = pv.product_id
//       LEFT JOIN product_images pi ON p.product_id = pi.product_id
//     `;

//     const queryParams = [];
//     if (subcategory_id) {
//       queryParams.push(subcategory_id);
//       query += ` WHERE p.subcategory_id = $1`;
//     }

//     query += `
//       GROUP BY 
//         p.product_id, 
//         v.store_name, 
//         c.category_name,
//         s.name
//     `;

//     const result = await pool.query(query, queryParams);
//     res.json(result.rows);
//   } catch (error) {
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// };

// const getProductsByVendorId = async (req, res) => {
//   const { id } = req.params;

//   try {
//     const result = await pool.query(
//       `SELECT 
//         p.*,
//         v.store_name,
//         c.category_name,
//         s.name as subcategory_name,
//         COALESCE(
//           array_agg(DISTINCT 
//             CASE 
//               WHEN pv.variant_id IS NOT NULL THEN 
//                 jsonb_build_object(
//                   'variant_id', pv.variant_id,
//                   'variant_name', pv.variant_name,
//                   'variant_price', pv.variant_price,
//                   'stock_quantity', pv.stock_quantity,
//                   'sku', pv.sku
//                 )
//             END
//           ) FILTER (WHERE pv.variant_id IS NOT NULL),
//           '{}'
//         ) AS variants,
//         COALESCE(
//           array_agg(DISTINCT 
//             CASE 
//               WHEN pi.image_id IS NOT NULL THEN 
//                 jsonb_build_object(
//                   'image_id', pi.image_id,
//                   'image_url', pi.image_url,
//                   'is_primary', pi.is_primary
//                 )
//             END
//           ) FILTER (WHERE pi.image_id IS NOT NULL),
//           '{}'
//         ) AS images
//       FROM products p
//       LEFT JOIN vendors v ON p.vendor_id = v.vendor_id
//       LEFT JOIN categories c ON p.category_id = c.category_id
//       LEFT JOIN subcategories s ON p.subcategory_id = s.subcategory_id
//       LEFT JOIN product_variants pv ON p.product_id = pv.product_id
//       LEFT JOIN product_images pi ON p.product_id = pi.product_id
//       WHERE p.vendor_id = $1
//       GROUP BY 
//         p.product_id, 
//         v.store_name, 
//         c.category_name,
//         s.name`,
//       [id]
//     );

//     res.json(result.rows);
//   } catch (error) {
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// };

// const deleteProduct = async (req, res) => {
//   const client = await pool.connect();
//   try {
//     const { id } = req.params;
    
//     // Start transaction
//     await client.query('BEGIN');
    
//     const productExists = await client.query(
//       `SELECT p.product_id, p.vendor_id, v.user_id 
//        FROM products p
//        INNER JOIN vendors v ON p.vendor_id = v.vendor_id
//        WHERE p.product_id = $1`,
//       [id]
//     );
    
//     if (productExists.rows.length === 0) {
//       return res.status(404).json({ message: 'Product not found' });
//     }
    
//     // If user is vendor_admin, ensure they can only delete their own products
//     if (req.user.role === 'vendor_admin') {
//       if (productExists.rows[0].user_id !== req.user.userId) {
//         return res.status(403).json({ message: 'Unauthorized to delete this product' });
//       }
//     }
    
//     // Delete product images
//     await client.query(
//       'DELETE FROM product_images WHERE product_id = $1',
//       [id]
//     );
    
//     // Delete product variants
//     await client.query(
//       'DELETE FROM product_variants WHERE product_id = $1',
//       [id]
//     );
    
//     // Delete the product
//     await client.query(
//       'DELETE FROM products WHERE product_id = $1',
//       [id]
//     );
    
//     // Commit transaction
//     await client.query('COMMIT');
    
//     res.json({ message: 'Product deleted successfully' });
//   } catch (error) {
//     // Rollback transaction in case of error
//     await client.query('ROLLBACK');
//     res.status(500).json({ message: 'Server error', error: error.message });
//   } finally {
//     client.release();
//   }
// };

// const updateProduct = async (req, res) => {
//   const client = await pool.connect();
//   try {
//     await client.query('BEGIN');
    
//     const { id } = req.params;
//     const { 
//       category_id,
//       subcategory_id,
//       product_name,
//       description,
//       base_price,
//       sku,
//       variants,
//       images
//     } = req.body;
    
//     // Get current product info and check authorization
//     const productQuery = await client.query(
//       `SELECT p.product_id, p.vendor_id, v.user_id 
//        FROM products p
//        INNER JOIN vendors v ON p.vendor_id = v.vendor_id
//        WHERE p.product_id = $1`,
//       [id]
//     );
    
//     if (productQuery.rows.length === 0) {
//       return res.status(404).json({ message: 'Product not found' });
//     }
    
//     const product = productQuery.rows[0];

//     // Check authorization - vendor admins can only update their own products
//     if (req.user.role === 'vendor_admin' && req.user.userId !== product.user_id) {
//       return res.status(403).json({ message: 'Unauthorized to update this product' });
//     }
    
//     // Verify category exists if provided
//     if (category_id) {
//       const categoryExists = await client.query(
//         'SELECT category_id FROM categories WHERE category_id = $1',
//         [category_id]
//       );

//       if (categoryExists.rows.length === 0) {
//         return res.status(400).json({ message: 'Category not found' });
//       }
//     }

//     // Update product basic info
//     const updateFields = [];
//     const updateValues = [];
//     let valueCounter = 1;
    
//     if (category_id !== undefined) {
//       updateFields.push(`category_id = $${valueCounter}`);
//       updateValues.push(category_id);
//       valueCounter++;
//     }
    
//     if (subcategory_id !== undefined) {
//       updateFields.push(`subcategory_id = $${valueCounter}`);
//       updateValues.push(subcategory_id || null);
//       valueCounter++;
//     }
    
//     if (product_name) {
//       updateFields.push(`product_name = $${valueCounter}`);
//       updateValues.push(product_name);
//       valueCounter++;
//     }
    
//     if (description) {
//       updateFields.push(`description = $${valueCounter}`);
//       updateValues.push(description);
//       valueCounter++;
//     }
    
//     if (base_price !== undefined) {
//       updateFields.push(`base_price = $${valueCounter}`);
//       updateValues.push(base_price);
//       valueCounter++;
//     }
    
//     if (sku) {
//       updateFields.push(`sku = $${valueCounter}`);
//       updateValues.push(sku);
//       valueCounter++;
//     }
    
//     if (updateFields.length > 0) {
//       updateValues.push(id);
      
//       await client.query(
//         `UPDATE products 
//          SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
//          WHERE product_id = $${valueCounter}`,
//         updateValues
//       );
//     }
    
//     // Handle variants update
//     if (variants && Array.isArray(variants)) {
//       const existingVariantsResult = await client.query(
//         'SELECT variant_id FROM product_variants WHERE product_id = $1',
//         [id]
//       );
//       const existingVariantIds = existingVariantsResult.rows.map(row => row.variant_id);
//       const variantIdsToKeep = [];
      
//       for (const variant of variants) {
//         if (variant.variant_id && existingVariantIds.includes(Number(variant.variant_id))) {
//           await client.query(
//             `UPDATE product_variants 
//              SET variant_name = $1, 
//                  variant_price = $2, 
//                  stock_quantity = $3, 
//                  sku = $4,
//                  updated_at = CURRENT_TIMESTAMP
//              WHERE variant_id = $5 AND product_id = $6`,
//             [
//               variant.name, 
//               variant.price, 
//               variant.stock_quantity, 
//               variant.sku,
//               variant.variant_id,
//               id
//             ]
//           );
          
//           variantIdsToKeep.push(Number(variant.variant_id));
//         } else if (!variant.variant_id) {
//           await client.query(
//             `INSERT INTO product_variants (
//               product_id, 
//               variant_name, 
//               variant_price, 
//               stock_quantity, 
//               sku
//             )
//             VALUES ($1, $2, $3, $4, $5)`,
//             [
//               id, 
//               variant.name, 
//               variant.price, 
//               variant.stock_quantity, 
//               variant.sku
//             ]
//           );
//         }
//       }
      
//       const variantsToDelete = existingVariantIds.filter(id => !variantIdsToKeep.includes(id));
      
//       if (variantsToDelete.length > 0) {
//         const placeholders = variantsToDelete.map((_, idx) => `$${idx + 1}`).join(',');
//         await client.query(
//           `DELETE FROM product_variants WHERE variant_id IN (${placeholders})`,
//           variantsToDelete
//         );
//       }
//     }
    
//     // Handle images update
//     if (images && Array.isArray(images)) {
//       const existingImagesResult = await client.query(
//         'SELECT image_id FROM product_images WHERE product_id = $1',
//         [id]
//       );
//       const existingImageIds = existingImagesResult.rows.map(row => row.image_id);
//       const imageIdsToKeep = [];
      
//       for (const image of images) {
//         if (image.image_id && existingImageIds.includes(Number(image.image_id))) {
//           await client.query(
//             `UPDATE product_images 
//              SET image_url = $1, 
//                  is_primary = $2,
//                  updated_at = CURRENT_TIMESTAMP
//              WHERE image_id = $3 AND product_id = $4`,
//             [
//               image.url, 
//               image.is_primary,
//               image.image_id,
//               id
//             ]
//           );
          
//           imageIdsToKeep.push(Number(image.image_id));
//         } else if (!image.image_id) {
//           await client.query(
//             `INSERT INTO product_images (
//               product_id, 
//               image_url, 
//               is_primary
//             )
//             VALUES ($1, $2, $3)`,
//             [id, image.url, image.is_primary]
//           );
//         }
//       }
      
//       const imagesToDelete = existingImageIds.filter(id => !imageIdsToKeep.includes(id));
      
//       if (imagesToDelete.length > 0) {
//         const placeholders = imagesToDelete.map((_, idx) => `$${idx + 1}`).join(',');
//         await client.query(
//           `DELETE FROM product_images WHERE image_id IN (${placeholders})`,
//           imagesToDelete
//         );
//       }
//     }
    
//     await client.query('COMMIT');
    
//     res.json({
//       message: 'Product updated successfully',
//       product_id: id
//     });
//   } catch (error) {
//     await client.query('ROLLBACK');
//     console.error('Error in updateProduct:', error);
//     res.status(500).json({ message: 'Server error', error: error.message });
//   } finally {
//     client.release();
//   }
// };

// module.exports = {
//   createProduct,
//   getProducts,
//   deleteProduct,
//   updateProduct,
//   getProductById,
//   getProductsByVendorId
// };