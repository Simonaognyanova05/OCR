import { getFieldValue } from '../../utils/form';
import styles from './Field.module.css';

function SelectField({ label, path, draft, onChange, options, labels = {} }) {
  const value = getFieldValue(draft, path) ?? '';

  return (
    <label className={`${styles.moduleRoot} field`}>
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(path, event.target.value || null)}>
        <option value="">-</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {labels[option] || option}
          </option>
        ))}
      </select>
    </label>
  );
}

export default SelectField;
