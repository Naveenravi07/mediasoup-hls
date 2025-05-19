# 🎥 Mediasoup SFU with HLS  

A minimal full-stack application demonstrating real-time video streaming between 
users via WebRTC (using **mediasoup SFU**), and live HLS playback for spectators via 
**FFmpeg**. Built with **NestJS** and **Next.js**.

---


### User Journey:

- **User 1 & 2** open `/stream`: they can enable camera/mic and are connected via WebRTC (through Mediasoup).
- **User 3** opens `/watch`: can view the interaction between User 1 and 2 as a real-time **HLS** stream.

---

## 🧰 Tech Stack

| Component        | Technology            |
|------------------|------------------------|
| Backend          | **NestJS**, **Mediasoup** |
| Transcoder       | **FFmpeg**              |
| Frontend         | **Next.js**, **TypeScript** |
| Media Transport  | **WebRTC**              |
| Viewer Protocol  | **HLS (HTTP Live Streaming)** |

---
