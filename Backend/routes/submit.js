const express = require("express");
const router = express.Router();
const problems = require("../data/problems");
const fs = require("fs");
const { execSync } = require("child_process");

router.post("/submit", (req,res)=>{

   const { code, problemId } = req.body;

   const problem = problems.find(p => p.id === problemId);

   if(!problem){
      return res.json({ status:"Problem Not Found" });
   }

   for(let tc of problem.testCases){

      fs.writeFileSync("./sandbox/code.js", code);
      fs.writeFileSync("./sandbox/input.txt", tc.input);

      try{

         const output = execSync(
           `docker run --rm -v ${process.cwd()}/sandbox:/app code-runner`
         ).toString().trim();

         if(output !== tc.expectedOutput.trim()){
            return res.json({
               status:"Wrong Answer",
               input:tc.input,
               expected:tc.expectedOutput,
               got:output
            });
         }

      }catch(err){
         return res.json({ status:"Runtime Error" });
      }

   }

   res.json({ status:"Accepted" });

});

module.exports = router;