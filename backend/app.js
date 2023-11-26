import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import fileUpload from 'express-fileupload';
import pdfParse from 'pdf-parse';
import xl from 'excel4node';
import fs from 'fs';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

app.use(bodyParser.json());
app.use(cors());
app.use(fileUpload());

async function extractTextFromPDF(pdfBuffer) {
  try {
    return await pdfParse(pdfBuffer);
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw error;
  }
}

function saveExtractedText(text, filePath) {
  fs.writeFileSync(filePath, text, { flag: 'a' }); 
}


function storeEmbeddingsInExcel(embeddings, filePath) {
  let wb = new xl.Workbook();
  let ws = wb.addWorksheet('Embeddings');

  embeddings.forEach((embedding, index) => {
    ws.cell(index + 1, 1).number(index + 1);
    ws.cell(index + 1, 2).string(JSON.stringify(embedding.embedding));
  });

  wb.write(filePath);
}


app.post('/upload', async (req, res) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).send('No PDF files uploaded.');
  }

  try {
    
    fs.writeFileSync('extractedText.txt', '');

    for (const key in req.files) {
      const pdf = req.files[key];
      const pdfText = await extractTextFromPDF(pdf.data);
      saveExtractedText(pdfText.text, 'extractedText.txt');
    }

    const textContext = fs.readFileSync('extractedText.txt', 'utf8');
    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: textContext,
      encoding_format: "float",
    });

    const embeddings = response.data;
    storeEmbeddingsInExcel(embeddings, 'embeddings.xlsx');
    res.send('PDFs processed and embeddings stored.');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error processing PDFs: ' + error.message);
  }
});

async function getTextContextFromPDFs() {
  try {
    const text = fs.readFileSync('extractedText.txt', 'utf8');
    return text;
  } catch (error) {
    console.error('Error reading text context:', error);
    throw error;
  }
}

app.post('/chat', async (req, res) => {
  try {
      const textContext = await getTextContextFromPDFs();

      const messages = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'assistant', content: textContext },
        { role: 'user', content: req.body.message }
      ];

      const completion = await openai.chat.completions.create({
          messages: messages,
          model: 'gpt-3.5-turbo',
      });

      res.json({ reply: completion.choices[0].message.content });
  } catch (error) {
      console.error(error);
      res.status(500).send('Error processing your request');
  }
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
