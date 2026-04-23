/**
 * Example WebSocket Client for Hand Sign Detection Backend
 *
 * Usage:
 * - Start the backend: npm start
 * - Run this client: node examples/client.js
 */

import WebSocket from "ws";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class HandSignClient {
  constructor(url = "ws://localhost:5000") {
    this.url = url;
    this.ws = null;
    this.buffer = "";
    this.frameCount = 0;
  }

  connect() {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.on("open", () => {
          console.log("✓ Connected to backend");
          resolve();
        });

        this.ws.on("message", (data) => {
          this.handleMessage(data);
        });

        this.ws.on("error", (error) => {
          console.error("✗ WebSocket error:", error.message);
          reject(error);
        });

        this.ws.on("close", () => {
          console.log("✓ Disconnected from backend");
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  handleMessage(data) {
    try {
      const message = JSON.parse(data.toString());

      if (message.type === "stream") {
        this.buffer += message.alphabet;
        console.log(
          `  Received: "${message.alphabet}" (Buffer: "${this.buffer}")`,
        );
      } else if (message.type === "final") {
        console.log(`\n✓ Final result: "${message.text}"\n`);
      } else {
        console.log("Received:", message);
      }
    } catch (error) {
      console.error("Error parsing message:", error.message);
    }
  }

  sendFrame(imageData) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error("WebSocket is not connected");
      return;
    }

    this.frameCount++;
    const frame =
      typeof imageData === "string" ? imageData : imageData.toString("base64");

    this.ws.send(
      JSON.stringify({
        type: "frame",
        frame: frame,
      }),
    );
  }

  endStream() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error("WebSocket is not connected");
      return;
    }

    this.ws.send(JSON.stringify({ type: "end" }));
  }

  close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

async function main() {
  const client = new HandSignClient("ws://localhost:5000");

  try {
    console.log("🚀 Hand Sign Detection Client Example\n");
    console.log("Connecting to backend...");
    await client.connect();

    console.log("\nSending frames...");

    // Simulate sending frames
    const frames = [
      "frame_1_data",
      "frame_2_data",
      "frame_3_data",
      "frame_4_data",
      "frame_5_data",
    ];

    for (const frame of frames) {
      client.sendFrame(frame);
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    console.log("Sending end signal...");
    client.endStream();

    // Wait for final response
    await new Promise((resolve) => setTimeout(resolve, 3000));

    client.close();
  } catch (error) {
    console.error("Error:", error.message);
  }
}

main();
