const express = require('express');
const path = require('path');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const port = 3000;

// Middleware to parse JSON bodies
app.use(express.json());
app.use(express.static('public'));

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI("AIzaSyDOj4J1E5boZF9L3bMK0WOq_DT1RhuEdsY");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/synonyms', async (req, res) => {
    try {
        const word = req.body.word?.trim();
        
        if (!word) {
            return res.status(400).json({ error: 'Please provide a valid word' });
        }

        console.log('Processing word:', word);

        const prompt = `Analyze the word "${word}" and provide:
1. 10 synonyms ordered from closest to furthest in meaning
2. 10 antonyms ordered from most opposite to least opposite
3. A list of common phrases, idioms, or expressions using "${word}" and synonyms of the words

For each synonym and antonym, include:
- Word
- Definition
- Usage difference from "${word}"
- Example sentence
- Formality (Formal/Informal/Literary/Technical)
- Tone (Positive/Negative/Neutral)
- Similarity score (0-100, for synonyms only)

Format as JSON:
{
  "synonyms": [
    {
      "word": "example",
      "meaning": "definition",
      "nuance": "usage difference",
      "example": "sentence",
      "formalityLevel": "Formal",
      "toneTypes": ["Positive"],
      "similarityScore": 95
    }
  ],
  "antonyms": [
    {
      "word": "example",
      "meaning": "definition",
      "nuance": "usage difference",
      "example": "sentence",
      "formalityLevel": "Formal",
      "toneTypes": ["Positive"]
    }
  ],
  "idioms": [
    "phrase or idiom 1",
    "phrase or idiom 2",
    "phrase or idiom 3"
  ]
}

Important:
- Provide EXACTLY 10 synonyms and 10 antonyms
- Include at least 3-5 common phrases or idioms
- Ensure all similarity scores are between 0-100
- Format the response exactly as shown above`;

        console.log('Sending request to AI...');
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });
        console.log('Received AI response');
        
        const response = await result.response;
        const text = response.text();
        console.log('Raw AI response:', text);

        let jsonData;
        try {
            // First try direct JSON parsing
            jsonData = JSON.parse(text);
        } catch (parseError) {
            console.error('Initial JSON parse failed:', parseError);
            
            // Try to extract JSON from markdown code block if present
            const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
            if (jsonMatch) {
                try {
                    jsonData = JSON.parse(jsonMatch[1]);
                } catch (blockParseError) {
                    console.error('Code block JSON parse failed:', blockParseError);
                    throw new Error('Invalid response format from AI');
                }
            } else {
                // Try to find JSON object in the text
                const jsonStart = text.indexOf('{');
                const jsonEnd = text.lastIndexOf('}') + 1;
                if (jsonStart >= 0 && jsonEnd > jsonStart) {
                    try {
                        jsonData = JSON.parse(text.slice(jsonStart, jsonEnd));
                    } catch (extractParseError) {
                        console.error('Extracted JSON parse failed:', extractParseError);
                        throw new Error('Invalid response format from AI');
                    }
                } else {
                    throw new Error('Could not find valid JSON in response');
                }
            }
        }

        // Validate the parsed data
        if (!jsonData || !Array.isArray(jsonData.synonyms) || !Array.isArray(jsonData.antonyms)) {
            console.error('Invalid data structure:', jsonData);
            throw new Error('Invalid response structure from AI');
        }

        // Validate number of items
        if (jsonData.synonyms.length < 10 || jsonData.antonyms.length < 10) {
            console.error('Insufficient number of items:', {
                synonyms: jsonData.synonyms.length,
                antonyms: jsonData.antonyms.length
            });
            throw new Error('Insufficient response data from AI');
        }

        // Send the response
        res.json({
            word: word,
            synonyms: jsonData.synonyms.slice(0, 10),
            antonyms: jsonData.antonyms.slice(0, 10),
            idioms: jsonData.idioms || []
        });

    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).json({ 
            error: 'Failed to analyze the word',
            details: error.message
        });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}).on('error', (err) => {
    console.error('Server failed to start:', err);
});
