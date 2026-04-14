-- RLS: ลบออเดอร์ของตัวเอง (rollback ตอน insert order_items ล้มเหลว) — รันซ้ำได้
drop policy if exists "orders_delete_own" on public.orders;
create policy "orders_delete_own" on public.orders for delete using (auth.uid() = user_id);
