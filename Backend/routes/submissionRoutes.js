const express = require("express");
const router = express.Router();

const Submission = require("../models/Submission");
const auth = require("../middleware/authMiddleware");

router.get("/:id", auth, async (req, res) => {

  try {

    const sub = await Submission.findById(req.params.id);

    if (!sub) {
      return res.json({ status: "not_found" });
    }

    res.json({
      status: sub.status,
      output: sub.output,
      error: sub.error,
      time: sub.time,
      memory: sub.memory
    });

  } catch (err) {

    console.log(err);
    res.json({ status: "server_error" });

  }

});

module.exports = router;