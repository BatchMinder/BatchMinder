import { useState, useEffect } from 'react';

export function useDepartments() {
  const [departments, setDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDepartments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/departments');
      const data = await response.json();
      if (response.ok && data.status === 'success') {
        // Sort alphabetically by department name
        const sorted = data.data.sort((a, b) => a.name.localeCompare(b.name));
        setDepartments(sorted);
      } else {
        setError(data.message || 'Failed to retrieve departments list.');
      }
    } catch (err) {
      setError('Connection failure: Unable to communicate with departments server.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  return { departments, isLoading, error, refetch: fetchDepartments };
}
