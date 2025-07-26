// Import necessary packages
const express = require('express');
// Use puppeteer-extra to make scraping more stealthy
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const cheerio = require('cheerio');

// Apply the stealth plugin
puppeteer.use(StealthPlugin());

// Initialize the express app
const app = express();
const PORT = process.env.PORT || 3000;

// Serve the 'public' folder, which contains your index.html
app.use(express.static('public'));

/**
 * Helper function to convert time strings (like "1:23.45") to seconds.
 */
function timeToSeconds(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return null;
    const parts = timeStr.split(':').map(parseFloat);
    if (parts.length === 2) {
        return parts[0] * 60 + parts[1];
    }
    return parts[0];
}

// Create an API endpoint that the frontend will call
app.get('/api/get-swimmer', async (req, res) => {
    const swimmerName = req.query.name;
    if (!swimmerName) {
        return res.status(400).json({ error: 'Swimmer name is required' });
    }

    let browser = null;
    let page = null; // Define page here to access it in the catch block
    try {
        // --- Step 1: Launch a headless browser with stealth ---
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        page = await browser.newPage();

        // --- NEW: Make the browser look even more like a real user ---
        await page.setViewport({ width: 1280, height: 800 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36');

        // --- Step 2: Search for the swimmer ---
        const searchUrl = `https://www.swimcloud.com/search?q=${encodeURIComponent(swimmerName)}`;
        await page.goto(searchUrl, { waitUntil: 'networkidle2' });

        // Wait for the search results to appear on the page
        await page.waitForSelector('a.c-list-item__link[href*="/swimmer/"]', { timeout: 15000 });

        // --- Step 3: Get the profile URL from the first search result ---
        const profileUrl = await page.evaluate(() => {
            const profileLink = document.querySelector('a.c-list-item__link[href*="/swimmer/"]');
            return profileLink ? profileLink.href : null;
        });

        if (!profileUrl) {
            throw new Error('Swimmer not found.');
        }

        // --- Step 4: Go to the profile page and scrape the data ---
        await page.goto(profileUrl, { waitUntil: 'networkidle2' });

        const content = await page.content();
        const $ = cheerio.load(content);

        const name = $('h1').text().trim();
        const team = $('a.c-list-item__meta-item').first().text().trim();
        const ageString = $('ul.c-list--horizontal > li').first().text().trim();
        const age = ageString.match(/\d+/) ? parseInt(ageString.match(/\d+/)[0], 10) : 18;

        let gender = 'Male';
        if ($('a.c-tabs__link[href$="/women"]').length > 0) {
            gender = 'Female';
        }

        const times = [];
        $('table.c-table-clean tr').each((i, row) => {
            const event = $(row).find('td:nth-child(1) a').text().trim();
            const time = $(row).find('td:nth-child(2) a').text().trim();

            if (event && time && event.includes('SCY')) {
                const cleanEventName = event.replace(' SCY', '');
                times.push({
                    event: cleanEventName,
                    time: timeToSeconds(time)
                });
            }
        });

        const swimmerData = { name, age, gender, club: team, times };
        res.json(swimmerData);

    } catch (error) {
        console.error('Scraping failed:', error.message);

        // --- NEW: Take a screenshot on error for debugging ---
        if (page) {
            try {
                const screenshotPath = 'error_screenshot.png';
                await page.screenshot({ path: screenshotPath });
                console.log(`Debug screenshot saved to ${screenshotPath}. Check this file in your Replit file explorer.`);
            } catch (ssError) {
                console.error("Could not take screenshot:", ssError.message);
            }
        }

        // More descriptive error for the frontend
        if (error instanceof puppeteer.errors.TimeoutError) {
             res.status(404).json({ error: 'Could not find the swimmer on SwimCloud. Please check the name and try again.' });
        } else {
             res.status(500).json({ error: 'Failed to fetch swimmer data. The server might be busy or blocked.' });
        }
    } finally {
        // --- Step 5: Close the browser ---
        if (browser) {
            await browser.close();
        }
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
