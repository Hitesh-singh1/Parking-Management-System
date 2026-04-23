const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const MAX_SPOTS = 50;
const RATE_PER_HOUR = 20;

// ENTRY
app.post("/entry", async (req, res) => {
  const { vehicle_number } = req.body;

  const { data, error } = await supabase
    .from("parking_logs")
    .insert([{ vehicle_number }])
    .select();

  if (error) return res.status(500).json(error);
  res.json(data);
});
app.get("/", (req, res) => {
  res.send("🚗 Parking API is running");
});

// EXIT
app.post("/exit/:id", async (req, res) => {
  const id = req.params.id;

  const { data: log } = await supabase
    .from("parking_logs")
    .select("*")
    .eq("id", id)
    .single();

  const entry = new Date(log.entry_time);
  const exit = new Date();

  const hours = Math.ceil((exit - entry) / (1000 * 60 * 60));
  const fee = hours * RATE_PER_HOUR;

  const { data, error } = await supabase
    .from("parking_logs")
    .update({
      exit_time: exit,
      fee,
      status: "exited"
    })
    .eq("id", id)
    .select();

  if (error) return res.status(500).json(error);
  res.json(data);
});

// ACTIVE VEHICLES
app.get("/active", async (req, res) => {
  const { data } = await supabase
    .from("parking_logs")
    .select("*")
    .eq("status", "parked");

  res.json(data);
});

// AVAILABLE SPOTS
app.get("/availability", async (req, res) => {
  const { count } = await supabase
    .from("parking_logs")
    .select("*", { count: "exact", head: true })
    .eq("status", "parked");

  res.json({ available: MAX_SPOTS - count });
});

app.listen(5000, () => console.log("Server running on 5000"));