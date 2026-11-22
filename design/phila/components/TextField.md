# TextField

ช่องกรอกข้อความพร้อมป้ายชื่อเสมอ ใช้ในหน้าตั้งค่า เช่น IP, ชื่อกล้อง, พอร์ต

- ผู้ใช้ส่ง: `label` (บังคับ), `value`/`onChange` หรือ `defaultValue`, `placeholder`, `hint`, `error`, และ attribute อื่นของ `<input>`
- `error` แทนที่ `hint` เป็นสี `tally-live` และตั้ง `aria-invalid` ให้เอง
- ค่าทางเทคนิค (IP, timecode) ส่ง `style={{fontFamily: 'var(--font-mono)'}}` ได้
- ห้ามใช้ placeholder แทน label
