import { validationResult } from "express-validator";
import ItemModel from "../models/itemModel.js";

const ItemsController = {

  getAllItems: async (req, res) => {
    try {
      const items = await ItemModel.getAllItems();
      res.status(200).json({ success: true, count: items.length, data: items });
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to fetch items", error: error.message });
    }
  },

  createItems: async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: "Validation failed", errors: errors.array() });
    }

    const { purchase_id, purchase_date, items } = req.body;

    try {
      const createdItems = [];
      for (const item of items) {
        const newItem = await ItemModel.createItem({
          purchase_id,
          purchase_date,
          item_name: item.item_name,
          type_name: item.type_name,
          in_stock:  item.in_stock
        });
        createdItems.push(newItem);
      }
      res.status(201).json({
        success: true,
        message: `${createdItems.length} item(s) saved successfully`,
        data: createdItems
      });
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to save items", error: error.message });
    }
  },

  updateItem: async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: "Validation failed", errors: errors.array() });
    }

    const { id } = req.params;
    const { item_name, type_name, purchase_date, in_stock } = req.body;

    try {
      const updated = await ItemModel.updateItem(id, { item_name, type_name, purchase_date, in_stock });
      if (!updated) {
        return res.status(404).json({ success: false, message: `Item with id ${id} not found` });
      }
      res.status(200).json({ success: true, message: "Item updated successfully", data: updated });
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to update item", error: error.message });
    }
  },

  deleteItem: async (req, res) => {
    const { id } = req.params;
    try {
      const deleted = await ItemModel.deleteItem(id);
      if (!deleted) {
        return res.status(404).json({ success: false, message: `Item with id ${id} not found` });
      }
      res.status(200).json({ success: true, message: "Item deleted successfully" });
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to delete item", error: error.message });
    }
  },

  getAllTypes: async (req, res) => {
    try {
      const types = await ItemModel.getAllTypes();
      res.status(200).json({ success: true, data: types });
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to fetch types", error: error.message });
    }
  }

};

export default ItemsController;