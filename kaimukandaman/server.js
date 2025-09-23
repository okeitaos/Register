import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";
import bodyParser from "body-parser";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Supabase
const SUPABASE_URL = "YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Nodemailer SMTP (Brevo)
const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false,
  auth: {
    user: "97ad4d001@smtp-brevo.com",
    pass: "YOUR_SMTP_KEY"
  }
});

// อัปเดตสถานะ + ส่งอีเมล
app.post("/approve", async (req,res)=>{
  const { id, status } = req.body;

  // ดึงผู้สมัครจาก Supabase
  const { data: applicant, error: fetchError } = await supabase
    .from("kaimukandaman")
    .select("*")
    .eq("id",id)
    .single();

  if(fetchError) return res.status(500).json({ error: fetchError.message });

  // อัปเดตสถานะ
  const { error } = await supabase
    .from("kaimukandaman")
    .update({ status })
    .eq("id", id);

  if(error) return res.status(500).json({ error: error.message });

  // ส่งอีเมลถ้าอนุมัติ
  if(status === "approved"){
    try{
      await transporter.sendMail({
        from: '"วิ่งมาราธอน" <97ad4d001@smtp-brevo.com>',
        to: applicant.email,
        subject: "ผลการสมัครวิ่ง",
        html: `<p>สวัสดี ${applicant.first_name} ${applicant.last_name}</p>
               <p>คุณได้รับอนุมัติให้เข้าร่วมการแข่งขันรุ่น: <strong>${applicant.category}</strong></p>
               <p>ขอบคุณที่สมัครเข้าร่วมกิจกรรม</p>`,
        attachments: [
          { filename: "slip.jpg", path: applicant.slip_url } // แนบสลิป
        ]
      });
    } catch(err){
      console.error("ส่งอีเมลไม่สำเร็จ:", err);
    }
  }

  res.json({ message: "อัปเดตสถานะสำเร็จ" });
});

app.listen(3000, ()=> console.log("Server running on http://localhost:3000"));
