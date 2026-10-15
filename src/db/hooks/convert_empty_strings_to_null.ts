export function convertEmptyStringsToNull(instance: any) {
  if (!instance || !instance.dataValues) return;
  for (const key of Object.keys(instance.dataValues)) {
    if (typeof instance.dataValues[key] === 'string' && instance.dataValues[key].trim() === '') {
      instance.dataValues[key] = null;
    }
  }
}
