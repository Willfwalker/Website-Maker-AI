require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs').promises;
const path = require('path');

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Add this after the genAI initialization
const cleanAndParseJSON = (text) => {
    // Remove any code fence markers and language identifiers completely
    const cleaned = text.replace(/```[\s\S]*?\n/g, '') 
                       .replace(/\n```/g, '')           
                       .replace(/^\s+|\s+$/g, '')       
                       .replace(/[\u200B-\u200D\uFEFF]/g, '');
    try {
        return JSON.parse(cleaned);
    } catch (error) {
        console.error('Failed to parse JSON:', cleaned);
        throw error;
    }
};

// Add this helper function after cleanAndParseJSON
const removeComments = (code) => {
    return code
        .replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '')
        .replace(/^\s*\/\//gm, '')
        .replace(/^\s*\*/gm, '') 
        .trim();
};

async function generateWebsitePlan(userPrompt) {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const initialPrompt = `
    You are a web development expert.
    Based on the website request: "${userPrompt}"
    
    Provide a JSON structure containing:
    1. A brief overview of the website's purpose
    2. A complete list of HTML and CSS files needed
    3. A description of the styling and layout approach
    
    Format as a valid JSON object with this structure:
    {
        "overview": "Brief description of the website",
        "files": [
            {
                "path": "index.html",
                "description": "Main HTML page with content structure"
            },
            {
                "path": "styles/main.css", 
                "description": "Main stylesheet with colors, typography and layout"
            },
            {
                "path": "styles/responsive.css",
                "description": "Additional styles for responsive design"
            }
        ],
        "styling": {
            "colorScheme": "Description of color palette",
            "layout": "Description of layout approach",
            "responsive": "Description of responsive design strategy"
        }
    }`;

    try {
        const planResult = await model.generateContent(initialPrompt);
        const plan = cleanAndParseJSON(planResult.response.text());

        // Generate code for each file
        const fileContents = {};
        for (const file of plan.files) {
            const codePrompt = `
            You are generating code for a file in a Spas and salon website.
            Generate the complete code for: ${file.path}
            Description: ${file.description}
            Website overview: ${plan.overview}
            
            Important instructions:
            1. For package.json files, include all necessary dependencies and scripts
            2. For configuration files, include all required settings
            3. For environment files, include all necessary variables
            4. Generate only the actual code, no comments or explanations
            5. Do not wrap the code in markdown or code blocks
            6. Include all necessary imports and exports
            7. For backend files, ensure Express, MongoDB, and authentication dependencies
            8. For frontend files, ensure React, Redux, and UI framework dependencies`;

            const codeResult = await model.generateContent(codePrompt);
            // Clean the generated code before storing it
            fileContents[file.path] = removeComments(codeResult.response.text().trim());
        }

        return {
            overview: plan.overview,
            files: fileContents
        };
    } catch (error) {
        console.error('Error generating website:', error);
        throw error;
    }
}

// Add file system handling
async function createDirectory(dirPath) {
    try {
        await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
        if (error.code !== 'EEXIST') throw error;
    }
}

// Add this helper function
async function logToCSV(projectName, duration, success) {
    const csvPath = path.join(process.cwd(), 'generation-times.csv');
    const timestamp = new Date().toISOString();
    const csvLine = `${timestamp},${projectName},${duration},${success}\n`;

    try {
        // Check if file exists, if not create with headers
        try {
            await fs.access(csvPath);
        } catch {
            await fs.writeFile(csvPath, 'timestamp,project_name,duration_seconds,success\n');
        }
        
        // Append the new data
        await fs.appendFile(csvPath, csvLine);
    } catch (error) {
        console.error('Failed to log to CSV:', error);
    }
}

async function createWebsite(userPrompt) {
    const startTime = performance.now();
    const projectName = userPrompt.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30);
    
    try {
        console.log('Generating website based on prompt:', userPrompt);
        const result = await generateWebsitePlan(userPrompt);
        
        // Create project directory
        const projectDir = path.join(process.cwd(), projectName);
        await createDirectory(projectDir);

        // Save overview
        await fs.writeFile(path.join(projectDir, 'website-overview.md'), result.overview);

        // Create and populate files
        for (const [filePath, content] of Object.entries(result.files)) {
            const fullPath = path.join(projectDir, filePath);
            await createDirectory(path.dirname(fullPath));
            await fs.writeFile(fullPath, content);
        }

        // New code: Remove first and last lines from all files
        for (const filePath of Object.keys(result.files)) {
            const fullPath = path.join(projectDir, filePath);
            const content = await fs.readFile(fullPath, 'utf8');
            const lines = content.split('\n');
            if (lines.length > 2) { // Only process if file has at least 3 lines
                const modifiedContent = lines.slice(1, -1).join('\n');
                await fs.writeFile(fullPath, modifiedContent);
            }
        }

        const endTime = performance.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        console.log(`\nWebsite files generated in: ${projectDir}`);
        console.log(`Total generation time: ${duration} seconds`);
        await logToCSV(projectName, duration, true);
    } catch (error) {
        const endTime = performance.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        console.error('Failed to create website:', error);
        console.log(`Failed after: ${duration} seconds`);
        await logToCSV(projectName, duration, false);
    }
}

module.exports = { generateWebsitePlan, createWebsite }; 