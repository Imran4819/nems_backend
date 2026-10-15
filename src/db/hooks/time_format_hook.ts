export function beforeSave(instance: any) {
  if (!instance) return;
  const now = new Date();
  if (instance.isNewRecord && !instance.created_at) {
    instance.created_at = now;
  }
  instance.updated_at = now;
}
