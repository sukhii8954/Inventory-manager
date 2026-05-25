import { Router } from "express";
import { body } from "express-validator";
import ItemsController from "../controllers/itemController.js";


const router = Router();

const createItemsRules = [
  body("purchase_id").notEmpty().withMessage("Purchase ID is required"),
  body("purchase_date").notEmpty().isDate().withMessage("Valid date required"),
  body("items").isArray({ min: 1 }).withMessage("At least one item is required"),
  body("items.*.item_name").notEmpty().withMessage("Item name is required"),
  body("items.*.type_name")
    .notEmpty()
    .isIn(["Electronics","Furniture","Clothing","Stationery","Kitchen","Sports","Other"])
    .withMessage("Invalid item type"),
  body("items.*.in_stock").isBoolean().withMessage("in_stock must be true or false")
];

const updateItemRules = [
  body("item_name").notEmpty().withMessage("Item name is required"),
  body("type_name")
    .notEmpty()
    .isIn(["Electronics","Furniture","Clothing","Stationery","Kitchen","Sports","Other"])
    .withMessage("Invalid item type"),
  body("purchase_date").notEmpty().isDate().withMessage("Valid date required"),
  body("in_stock").isBoolean().withMessage("in_stock must be true or false")
];

router.get("/",       ItemsController.getAllItems);
router.get("/types",  ItemsController.getAllTypes);
router.post("/",      createItemsRules, ItemsController.createItems);
router.put("/:id",    updateItemRules,  ItemsController.updateItem);
router.delete("/:id", ItemsController.deleteItem);

export default router;