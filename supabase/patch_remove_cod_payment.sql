-- รันครั้งเดียวถ้าเคยสร้าง enum แบบมี 'cod' แล้วต้องการให้ตรงกับ schema ใหม่
-- แถวเก่าที่เป็น cod จะถูกแปลงเป็น 'qr'

create type public.payment_method_new as enum ('qr', 'credit_card');

alter table public.orders
  alter column payment_method type public.payment_method_new
  using (
    case payment_method::text
      when 'cod' then 'qr'::public.payment_method_new
      else payment_method::text::public.payment_method_new
    end
  );

drop type public.payment_method;
alter type public.payment_method_new rename to payment_method;
