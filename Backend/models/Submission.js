const submissionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  problemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Problem"
  },
  code: String,
  language: String,
  status: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
})