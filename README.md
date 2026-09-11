# Automation for Elective System — College Portal

A responsive, production-ready web application for automating college **Professional Elective (PE)** and **Open Elective (OE)** subject selection and allotment using atomic **First-In, First-Out (FIFO)** scheduling with Supabase.

---

## 🚀 Key Features

- **College Email Authentication**: Strict student validation where only enrolled college emails can sign in.
- **Dynamic Curriculum & Quotas**: Independent management for Professional Electives (PE) and Open Electives (OE).
- **Drag-and-Drop Preference Selector**: Visual ranking with medal indicators (`🥇`, `🥈`, `🥉`).
- **Locked Choice Security**: Immutable priority submissions to prevent race conditions.
- **Real-Time FIFO Allotment**: Automatic atomic allocation on submit based on timestamp and seat capacity.
- **Coordinator Control Center**: Live seat analytics with Recharts, manual overrides with audit trails, and separate printable sheets.
- **Printable Layouts & CSV Export**: Print-friendly official allotment memos and CSV rosters.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide React, Recharts, Canvas Confetti
- **Routing**: React Router DOM v6
- **Database & Backend**: Supabase (PostgreSQL, Row Level Security, Pl/pgSQL RPC)

---

## 🏁 Getting Started

### 1. Clone & Install
```bash
git clone https://github.com/YOUR_USERNAME/automatedelective.git
cd automatedelective
npm install
```

### 2. Configure Environment
Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Setup Database Schema
Execute the SQL script located in `supabase/schema.sql` inside your Supabase project's **SQL Editor**.

### 4. Run Locally
```bash
npm run dev
```

---

## 👥 Default Accounts

- **Coordinator Login**: `coordinator@college.edu` / `admin123`
- **Student Login**: Add any student email in the Coordinator Dashboard $\rightarrow$ Curriculum & Students $\rightarrow$ Enrolled Students.
