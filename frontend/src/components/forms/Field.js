import { getFieldValue, parseValue } from '../../utils/form';

function Field({ label, path, draft, onChange, type = 'text' }) {
  const value = getFieldValue(draft, path);

  return (
    <label className="field">
      <span>{label}</span>
      <input
        type={type === 'number' ? 'number' : type}
        value={value ?? ''}
        onChange={(event) => onChange(path, parseValue(event.target.value, type))}
      />
    </label>
  );
}

export default Field;

