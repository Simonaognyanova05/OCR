import { getFieldValue, parseValue } from '../../utils/form';
import styles from './Field.module.css';

function Field({ label, path, draft, onChange, type = 'text' }) {
  const value = getFieldValue(draft, path);

  return (
    <label className={`${styles.moduleRoot} field`}>
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
