import { Link } from 'react-router-dom';
import { Button } from '@autotests-simulator/ui';
import { StateMessage } from '../components/StateMessage';

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-20">
      <StateMessage
        testId="not-found"
        title="We couldn’t find that page"
        description="The page you’re looking for may have moved or sold out."
        action={
          <Button asChild>
            <Link to="/store">Back to the shop</Link>
          </Button>
        }
      />
    </div>
  );
}
