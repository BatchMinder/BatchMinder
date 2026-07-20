import mongoose from 'mongoose';

export const scopeToUserDepartments = (req) => {
  if (!req.user) {
    return {};
  }

  let role = req.user.role;
  if (!role && req.user.email) {
    if (req.user.email.includes('dean')) role = 'dean';
    else if (req.user.email.includes('admin')) role = 'academic_admin';
    else if (req.user.email.includes('advisor')) role = 'advisor';
  }

  if (role === 'dean') {
    return {};
  }

  if (role === 'academic_admin' || role === 'admin') {
    const ids = (req.user.departmentIds || []).map(id => new mongoose.Types.ObjectId(id.toString()));
    if (ids.length > 0) return { departmentId: { $in: ids } };
    return {};
  }

  if (role === 'advisor') {
    const ids = (req.user.assignedBatchIds || []).map(id => new mongoose.Types.ObjectId(id.toString()));
    if (ids.length > 0) return { batchId: { $in: ids } };
    const deptIds = (req.user.departmentIds || []).map(id => new mongoose.Types.ObjectId(id.toString()));
    if (deptIds.length > 0) return { departmentId: { $in: deptIds } };
    return {};
  }

  return {};
};

export const scopeBatchToUserDepartments = (req) => {
  if (!req.user) return {};
  if (req.user.role === 'dean' || req.user.role === 'super_admin') return {};
  const ids = (req.user.departmentIds || []).map(id => new mongoose.Types.ObjectId(id.toString()));
  if (ids.length > 0) return { departmentId: { $in: ids } };
  return {};
};

// Used for audit log and notification role-scoping
export const scopeQueryToRole = (user) => {
  if (!user) return {};

  if (user.role === 'dean') {
    return {};
  }

  if (user.role === 'academic_admin' || user.role === 'admin') {
    const ids = (user.departmentIds || []).map(id => new mongoose.Types.ObjectId(id.toString()));
    if (ids.length > 0) return { departmentId: { $in: ids } };
    return {};
  }

  if (user.role === 'advisor') {
    const ids = (user.assignedBatchIds || []).map(id => new mongoose.Types.ObjectId(id.toString()));
    if (ids.length > 0) return { batchId: { $in: ids } };
    const deptIds = (user.departmentIds || []).map(id => new mongoose.Types.ObjectId(id.toString()));
    if (deptIds.length > 0) return { departmentId: { $in: deptIds } };
    return {};
  }

  return {};
};
