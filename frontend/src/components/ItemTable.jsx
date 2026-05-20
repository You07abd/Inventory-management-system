import { Link } from "react-router-dom";

function nameById(collection, id) {
  return collection.find((entry) => entry.id === id)?.name || "Unassigned";
}

export default function ItemTable({ items, categories = [], locations = [], onCheckout, onCheckin }) {
  if (items.length === 0) {
    return <div className="empty-state">No inventory items match the current view.</div>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Asset</th>
            <th>Name</th>
            <th>Category</th>
            <th>Location</th>
            <th>Available</th>
            <th>Condition</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const checkedOut = item.quantity - item.available_quantity;
            return (
              <tr key={item.id}>
                <td>
                  <Link className="asset-link" to={`/items/${item.id}`}>
                    {item.asset_code}
                  </Link>
                </td>
                <td>{item.name}</td>
                <td>{nameById(categories, item.category_id)}</td>
                <td>{nameById(locations, item.location_id)}</td>
                <td>
                  {item.available_quantity} / {item.quantity}
                </td>
                <td>{item.condition}</td>
                <td>
                  <span className={`status ${item.status}`}>{item.status.replaceAll("_", " ")}</span>
                </td>
                <td>
                  <div className="row-actions">
                    <button type="button" onClick={() => onCheckout(item)} disabled={item.available_quantity < 1}>
                      Out
                    </button>
                    <button type="button" className="secondary" onClick={() => onCheckin(item)} disabled={checkedOut < 1}>
                      In
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
