# Electoral management system

*Automatically synced with your [v0.app](https://v0.app) deployments*

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/alexjmzs-projects-47e59a5d/v0-electoral-management-system)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.app-black?style=for-the-badge)](https://v0.app/chat/projects/b4J7U3mdLyM)

## Overview

This repository will stay in sync with your deployed chats on [v0.app](https://v0.app).
Any changes you make to your deployed app will be automatically pushed to this repository from [v0.app](https://v0.app).

## Deployment

Your project is live at:

**[https://vercel.com/alexjmzs-projects-47e59a5d/v0-electoral-management-system](https://vercel.com/alexjmzs-projects-47e59a5d/v0-electoral-management-system)**

## Build your app

Continue building your app on:

**[https://v0.app/chat/projects/b4J7U3mdLyM](https://v0.app/chat/projects/b4J7U3mdLyM)**

## How It Works

1. Create and modify your project using [v0.app](https://v0.app)
2. Deploy your chats from the v0 interface
3. Changes are automatically pushed to this repository
4. Vercel deploys the latest version from this repository

## Change Database Connection (Supabase)

This app connects to Supabase using environment variables.

1. Create a local env file from `.env.example`:
	- `cp .env.example .env.local` (macOS/Linux)
	- `Copy-Item .env.example .env.local` (PowerShell)
2. Set your new project credentials in `.env.local`:
	- `NEXT_PUBLIC_SUPABASE_URL`
	- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Restart your dev server.

The app also supports `SUPABASE_URL` and `SUPABASE_ANON_KEY` as aliases.