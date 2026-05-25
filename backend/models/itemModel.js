import db from "../config/db.js";

const ItemModel = {

  getAllItems: async () => {
    const query = `
      SELECT
        items.id,
        items.purchase_id,
        items.item_name,
        items.purchase_date,
        items.in_stock,
        items.created_at,
        item_types.type_name
      FROM items
      JOIN item_types ON items.type_id = item_types.id
      ORDER BY items.created_at DESC
    `;
    const [rows] = await db.query(query);
    return rows;
  },

  getItemById: async (id) => {
    const query = `
      SELECT
        items.id,
        items.purchase_id,
        items.item_name,
        items.purchase_date,
        items.in_stock,
        item_types.type_name
      FROM items
      JOIN item_types ON items.type_id = item_types.id
      WHERE items.id = ?
    `;
    const [rows] = await db.query(query, [id]);
    return rows[0];
  },

  getTypeId: async (typeName) => {
    const [rows] = await db.query(
      "SELECT id FROM item_types WHERE type_name = ?",
      [typeName]
    );
    return rows[0] ? rows[0].id : null;
  },

  createItem: async ({ purchase_id, item_name, type_name, purchase_date, in_stock }) => {
    const typeId = await ItemModel.getTypeId(type_name);
    if (!typeId) throw new Error(`Invalid item type: ${type_name}`);

    const query = `
      INSERT INTO items (purchase_id, item_name, type_id, purchase_date, in_stock)
      VALUES (?, ?, ?, ?, ?)
    `;
    const [result] = await db.query(query, [
      purchase_id,
      item_name,
      typeId,
      purchase_date,
      in_stock ? 1 : 0
    ]);
    return await ItemModel.getItemById(result.insertId);
  },

  updateItem: async (id, { item_name, type_name, purchase_date, in_stock }) => {
    const typeId = await ItemModel.getTypeId(type_name);
    if (!typeId) throw new Error(`Invalid item type: ${type_name}`);

    const query = `
      UPDATE items
      SET item_name = ?, type_id = ?, purchase_date = ?, in_stock = ?
      WHERE id = ?
    `;
    await db.query(query, [item_name, typeId, purchase_date, in_stock ? 1 : 0, id]);
    return await ItemModel.getItemById(id);
  },

  deleteItem: async (id) => {
    const [result] = await db.query("DELETE FROM items WHERE id = ?", [id]);
    return result.affectedRows > 0;
  },

  getAllTypes: async () => {
    const [rows] = await db.query("SELECT * FROM item_types ORDER BY type_name");
    return rows;
  }

};

export default ItemModel;