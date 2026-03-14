-- Create storage bucket for chart images
insert into storage.buckets (id, name, public)
values ('chart-images', 'chart-images', true)
on conflict (id) do nothing;

-- Set up RLS policies for chart-images bucket
create policy "Users can upload their own chart images"
on storage.objects for insert
with check (bucket_id = 'chart-images' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can view their own chart images"
on storage.objects for select
using (bucket_id = 'chart-images' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can delete their own chart images"
on storage.objects for delete
using (bucket_id = 'chart-images' and auth.uid()::text = (storage.foldername(name))[1]);
