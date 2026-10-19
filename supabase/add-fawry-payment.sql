begin;

alter table public.orders
  drop constraint if exists orders_payment_method_check;
alter table public.orders
  drop constraint if exists orders_payment_method_allowed;
alter table public.orders
  add constraint orders_payment_method_allowed check (
    payment_method in (
      'Vodafone Cash', 'Etisalat Cash', 'InstaPay', 'Fawry', 'Orange Cash'
    )
  );

commit;
