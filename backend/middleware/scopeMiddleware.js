export const scopeToUserDepartments = (req) => {
  if (!req.user) {
    return { _id: null };
  }

  if (req.user.role === 'super_admin') {
    return {};
  }

  if (req.user.role === 'academic_admin') {
    const ids = req.user.departmentIds || [];
    if (ids.length === 0) return { _id: null };
    return { departmentId: { $in: ids } };
  }

  if (req.user.role === 'admin') {
    const ids = req.user.departmentIds || [];
    if (ids.length === 0) return { _id: null };
    return { departmentId: { $in: ids } };
  }

  if (req.user.role === 'advisor') {
    return {};
  }

  return { _id: null };
};

export const scopeBatchToUserDepartments = (req) => {
  if (!req.user) return { _id: null };
  if (req.user.role === 'super_admin') return {};
  const ids = req.user.departmentIds || [];
  if (ids.length === 0) return { _id: null };
  return { departmentId: { $in: ids } };
};

// Used for audit log and notification role-scoping
export const scopeQueryToRole = (user) => {
  if (!user) return { _id: null };

  if (user.role === 'super_admin') {
    return {};
  }

  if (user.role === 'academic_admin') {
    const ids = (user.departmentIds || []).map(id => id.toString());
    if (ids.length === 0) return { _id: null };
    return { departmentId: { $in: ids } };
  }

  if (user.role === 'admin') {
    const deptId = user.departmentId || (user.departmentIds && user.departmentIds[0]);
    return { departmentId: deptId ? deptId.toString() : null };
  }

  if (user.role === 'advisor') {
    const ids = (user.assignedBatchIds || []).map(id => id.toString());
    if (ids.length === 0) return { _id: null };
    return { batchId: { $in: ids } };
  }

  return { _id: null };
};
