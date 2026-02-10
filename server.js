const express = require("express");
const cors = require("cors");
require("dotenv").config();
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

const EMAIL = "ritin0867.be23@chitkara.edu.in"; 
const API_KEY = process.env.GEMINI_API_KEY;

// --- HELPER FUNCTIONS ---
const isPrime = (n) => {
  if (n < 2) return false;
  for (let i = 2; i <= Math.sqrt(n); i++) {
    if (n % i === 0) return false;
  }
  return true;
};

const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
const lcm = (a, b) => (a * b) / gcd(a, b);

// --- ROUTES ---
app.get("/health", (req, res) => {
  return res.status(200).json({
    is_success: true,
    official_email: EMAIL
  });
});

app.post("/bfhl", async (req, res) => {
  try {
    const body = req.body;
    let data;
    
    // 1. Fibonacci Logic
    if (body.fibonacci !== undefined) {
      const n = parseInt(body.fibonacci);
      if (isNaN(n) || n < 0) throw "Invalid input";
      if (n === 1) data = [0];
      else {
          let fib = [0, 1];
          while(fib.length < n) fib.push(fib[fib.length - 1] + fib[fib.length - 2]);
          data = fib.slice(0, n);
      }
    }

    // 2. Prime Logic
    else if (body.prime) {
      if (!Array.isArray(body.prime)) throw "Invalid input";
      data = body.prime.filter(num => isPrime(parseInt(num)));
    }

    // 3. LCM Logic
    else if (body.lcm) {
      if (!Array.isArray(body.lcm)) throw "Invalid input";
      data = body.lcm.reduce((a, b) => lcm(a, b));
    }

    // 4. HCF Logic
    else if (body.hcf) {
      if (!Array.isArray(body.hcf)) throw "Invalid input";
      data = body.hcf.reduce((a, b) => gcd(a, b));
    }

    // 5. AI Logic (DYNAMIC - NO HARDCODING)
    else if (body.AI) {
      const question = body.AI.toString();
      console.log("Asking AI:", question);

      try {
        // STEP A: Dynamically find a working model from Google
        // We ask Google: "Which models does this API key have access to?"
        const modelsResponse = await axios.get(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`
        );
        
        // Filter for a model that supports generating content
        const validModel = modelsResponse.data.models.find(
            m => m.name.includes("gemini") && m.supportedGenerationMethods.includes("generateContent")
        );

        if (!validModel) throw new Error("No valid Gemini model found for this key.");
        
        const modelName = validModel.name.replace("models/", "");
        console.log(`Using Model: ${modelName}`);

        // STEP B: Use the found model to generate the answer
        const response = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`,
          {
            contents: [{ parts: [{ text: "Answer in exactly one word: " + question }] }]
          },
          { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
        );

        // Extract the REAL answer
        if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
             data = response.data.candidates[0].content.parts[0].text.trim().split(" ")[0];
        } else {
             throw new Error("No text returned from AI");
        }

      } catch (aiError) {
        console.error("AI Error:", aiError.response?.data || aiError.message);
        throw new Error("AI Service Unavailable: " + (aiError.response?.status || aiError.message));
      }
    }

    else {
      return res.status(400).json({ is_success: false, official_email: EMAIL, message: "Invalid Key" });
    }

    return res.status(200).json({
      is_success: true,
      official_email: EMAIL,
      data: data
    });

  } catch (err) {
    return res.status(500).json({ // Changed to 500 for server errors
      is_success: false,
      official_email: EMAIL,
      message: err.toString()
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});