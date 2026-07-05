import Batch from '../models/batch.js';

export const scopeQueryToRole = async (user) => {
  if (!user) {
    return { _id: null };
  }

  // SuperAdmin (super_admin): no scope restriction
  if (user.role === 'super_admin') {
    return {};
  }

  // Administrator (academic_admin) & HOD (admin): scoped to department
  if (user.role === 'academic_admin' || user.role === 'admin') {
    const deptName = user.dept || '';
    return { departmentId: deptName };
  }

  // BatchAdvisor (advisor): scoped to assigned batches
  if (user.role === 'advisor') {
    const assigned = await Batch.find({ advisor: user.name });
    const codes = assigned.map(b => b.code);
    return { batchId: { $in: codes } };
  }

  // Block by default
  return { _id: null };
};
