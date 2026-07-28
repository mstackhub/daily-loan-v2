import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import https from "https";
import http from "http";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AVATARS_DIR = path.join(__dirname, "../public/avatars");

// Ensure directory exists
if (!fs.existsSync(AVATARS_DIR)) {
  fs.mkdirSync(AVATARS_DIR, { recursive: true });
}

// Function to download a file, following redirects
function downloadFile(url, destPath, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) {
      reject(new Error("Too many redirects"));
      return;
    }

    const client = url.startsWith("https") ? https : http;
    client.get(url, (res) => {
      // Handle redirect
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (!redirectUrl.startsWith("http")) {
          // Resolve relative URL
          const parsedUrl = new URL(url);
          redirectUrl = `${parsedUrl.protocol}//${parsedUrl.host}${redirectUrl}`;
        }
        resolve(downloadFile(redirectUrl, destPath, redirectCount + 1));
        return;
      }

      if (res.statusCode !== 200) {
        reject(new Error(`Failed to download: Status Code ${res.statusCode}`));
        return;
      }

      const fileStream = fs.createWriteStream(destPath);
      res.pipe(fileStream);
      fileStream.on("finish", () => {
        fileStream.close();
        resolve();
      });
    }).on("error", (err) => {
      reject(err);
    });
  });
}

function fetchBatch() {
  return new Promise((resolve, reject) => {
    https.get("https://api.thecatapi.com/v1/images/search?limit=10&mime_types=jpg,png", (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on("error", (err) => {
      reject(err);
    });
  });
}

async function main() {
  console.log("Fetching 40 cat images...");
  const allImages = [];
  const urls = new Set();
  
  // Try to fetch up to 10 batches to get 40 unique cat URLs
  for (let batch = 0; batch < 10; batch++) {
    try {
      const batchImages = await fetchBatch();
      for (const img of batchImages) {
        if (!urls.has(img.url)) {
          urls.add(img.url);
          allImages.push(img);
        }
      }
      if (allImages.length >= 40) break;
    } catch (e) {
      console.error("Batch fetch error:", e.message);
    }
  }

  console.log(`Found ${allImages.length} unique cats. Downloading...`);

  for (let i = 0; i < 40; i++) {
    const destFile = path.join(AVATARS_DIR, `cat_avatar_${i + 1}.jpg`);
    let downloaded = false;

    // Try downloading the specific cat from the list
    if (i < allImages.length) {
      const img = allImages[i];
      console.log(`[${i + 1}/40] Downloading from Cat API: ${img.url}`);
      try {
        await downloadFile(img.url, destFile);
        downloaded = true;
      } catch (err) {
        console.error(`Failed to download ${img.url}: ${err.message}`);
      }
    }

    // Fallback if download failed or not enough images fetched
    if (!downloaded) {
      console.log(`[${i + 1}/40] Using PlaceCats fallback...`);
      try {
        await downloadFile(`https://placecats.com/150/150`, destFile);
      } catch (err) {
        console.error(`Fallback failed: ${err.message}`);
        // Ultimate fallback to CATAAS
        try {
          await downloadFile(`https://cataas.com/cat`, destFile);
        } catch (err2) {
          console.error(`Ultimate fallback failed: ${err2.message}`);
        }
      }
    }
  }

  console.log("Cleanup: removing png duplicates if any...");
  for (let i = 1; i <= 40; i++) {
    const pngPath = path.join(AVATARS_DIR, `cat_avatar_${i}.png`);
    if (fs.existsSync(pngPath)) {
      try {
        fs.unlinkSync(pngPath);
      } catch (e) {}
    }
  }

  console.log("All 40 cat avatars are ready in public/avatars/!");
}

main();
