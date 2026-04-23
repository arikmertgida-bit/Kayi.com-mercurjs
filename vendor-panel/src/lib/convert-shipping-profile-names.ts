export default (sp: any) => {
  const profileName = sp?.shipping_profile?.name ?? ""
  const name = profileName.includes(":")
    ? profileName.split(":")[1]
    : profileName
  return {
    ...sp,
    shipping_profile: {
      ...sp?.shipping_profile,
      name,
    },
  }
}
