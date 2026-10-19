const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
    getTasks,
    createTask,
    updateTask,
    deleteTask,
    addProgress,
    submitTask,
    reviewTask,
} = require("../controllers/taskController");

router.get("/", protect, getTasks);
router.post("/", protect, createTask);

// Daily work flow: update progress -> submit -> manager approves or asks for rework
router.post("/:id/progress", protect, addProgress);
router.put("/:id/submit", protect, submitTask);
router.put("/:id/review", protect, reviewTask);

router.put("/:id", protect, updateTask);
router.delete("/:id", protect, deleteTask);

module.exports = router;







// const express = require("express");
// const router = express.Router();
// const { protect } = require("../middleware/authMiddleware");
// const { getTasks, createTask, updateTask, deleteTask } = require("../controllers/taskController");

// router.get("/", protect, getTasks);
// router.post("/", protect, createTask);
// router.put("/:id", protect, updateTask);
// router.delete("/:id", protect, deleteTask);

// module.exports = router;