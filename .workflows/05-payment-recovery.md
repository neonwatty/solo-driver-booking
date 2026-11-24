# Recover from a failed payment

The rider can see what happened and what they need to do next.

1. Simulate an unsuccessful payment attempt from the [quote screen](04-payment-and-confirmation.md). The rider sees **Payment failed**, their trip details, the total, and **Try again**.
2. If the quote and pickups are still available, **Try again** returns to checkout. Successful payment confirms the booking.
3. If the quote has expired or a leg is no longer available, show **Request an updated quote**. The rider sends the trip back to **Requests** for the driver to review.

**Demo behavior.** The prototype can simulate a failed payment or expired quote. A booking becomes **Confirmed** after successful payment.
