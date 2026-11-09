
const express = require("express");
const router = express.Router();

const { protect, authorize } = require("../middleware/authMiddleware");
const uploadDocument = require("../middleware/uploadDocument");
const documentController = require("../controllers/documentController");

router.param("id", (req, res, next, id) => {
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
        return res.status(404).json({
            success: false,
            message: "Document not found.",
        });
    }

    next();
});

router.get("/mine", protect, documentController.getMyDocuments);
router.get("/", protect, documentController.getDocuments);
router.get("/:id/file", protect, documentController.getFile);

router.post(
    "/",
    protect,
    authorize("admin", "hr"),
    uploadDocument,
    documentController.uploadDocument
);

router.put(
    "/:id",
    protect,
    authorize("admin", "hr"),
    uploadDocument,
    documentController.updateDocument
);

router.delete(
    "/:id",
    protect,
    authorize("admin", "hr"),
    documentController.deleteDocument
);
// router.delete("/:id", protect, authorize("admin"), ctrl.deleteDocument);
module.exports = router;


