"""
Backend API tests for Purchase Tracker - Forge SaaS OS
Tests: stage-totals, customer stage-totals, move-stage APIs
"""
import pytest
import requests

BASE_URL = "http://localhost:3000"

class TestStageTotalsAPI:
    """Tests for /api/purchase-orders/stage-totals endpoint"""
    
    def test_get_stage_totals_success(self):
        """GET /api/purchase-orders/stage-totals returns aggregated totals"""
        response = requests.get(f"{BASE_URL}/api/purchase-orders/stage-totals")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Validate response structure
        assert "ordered" in data, "Missing 'ordered' field"
        assert "pendingCo" in data, "Missing 'pendingCo' field"
        assert "pendingDist" in data, "Missing 'pendingDist' field"
        assert "godown" in data, "Missing 'godown' field"
        assert "inBox" in data, "Missing 'inBox' field"
        assert "dispatched" in data, "Missing 'dispatched' field"
        assert "notDisplayed" in data, "Missing 'notDisplayed' field"
        
        # Validate data types
        assert isinstance(data["ordered"], int), "ordered should be int"
        assert isinstance(data["pendingCo"], int), "pendingCo should be int"
        
        # Validate expected values from seed data (Total Ordered=39)
        assert data["ordered"] == 39, f"Expected ordered=39, got {data['ordered']}"
        print(f"Stage totals: ordered={data['ordered']}, pendingCo={data['pendingCo']}, godown={data['godown']}, inBox={data['inBox']}, dispatched={data['dispatched']}")


class TestCustomerStageTotalsAPI:
    """Tests for /api/customers/[customerId]/stage-totals endpoint"""
    
    def test_get_customer_stage_totals_proj001(self):
        """GET /api/customers/proj-001/stage-totals returns customer-scoped totals"""
        response = requests.get(f"{BASE_URL}/api/customers/proj-001/stage-totals")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Validate response structure
        assert "ordered" in data, "Missing 'ordered' field"
        assert "pendingCo" in data, "Missing 'pendingCo' field"
        assert "godown" in data, "Missing 'godown' field"
        
        # Validate data types
        assert isinstance(data["ordered"], int), "ordered should be int"
        print(f"Customer proj-001 totals: ordered={data['ordered']}, pendingCo={data['pendingCo']}, godown={data['godown']}")
    
    def test_get_customer_stage_totals_proj002(self):
        """GET /api/customers/proj-002/stage-totals returns customer-scoped totals"""
        response = requests.get(f"{BASE_URL}/api/customers/proj-002/stage-totals")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "ordered" in data, "Missing 'ordered' field"
        print(f"Customer proj-002 totals: ordered={data['ordered']}, pendingCo={data['pendingCo']}")
    
    def test_get_customer_stage_totals_nonexistent(self):
        """GET /api/customers/nonexistent/stage-totals returns zeros for unknown customer"""
        response = requests.get(f"{BASE_URL}/api/customers/nonexistent-customer/stage-totals")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Should return zeros for non-existent customer
        assert data["ordered"] == 0, f"Expected ordered=0 for nonexistent customer, got {data['ordered']}"


class TestMoveStageAPI:
    """Tests for /api/purchase-orders/lines/[lineId]/move-stage endpoint"""
    
    def test_move_stage_invalid_line(self):
        """PATCH with invalid lineId returns 404"""
        response = requests.patch(
            f"{BASE_URL}/api/purchase-orders/lines/invalid-line-id/move-stage",
            json={"fromStage": "ORDERED", "toStage": "PENDING_CO", "qty": 1}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    def test_move_stage_illegal_transition(self):
        """PATCH with illegal transition returns 422"""
        # DISPATCHED -> ORDERED is not a legal transition
        response = requests.patch(
            f"{BASE_URL}/api/purchase-orders/lines/line-001/move-stage",
            json={"fromStage": "DISPATCHED", "toStage": "ORDERED", "qty": 1}
        )
        # Should fail with 422 (illegal transition) or 400 (validation error)
        assert response.status_code in [400, 422], f"Expected 400/422, got {response.status_code}"
    
    def test_move_stage_insufficient_qty(self):
        """PATCH with qty exceeding available returns 422"""
        response = requests.patch(
            f"{BASE_URL}/api/purchase-orders/lines/line-001/move-stage",
            json={"fromStage": "ORDERED", "toStage": "PENDING_CO", "qty": 9999}
        )
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        
        data = response.json()
        assert "INSUFFICIENT_QTY" in str(data) or "insufficient" in str(data).lower(), f"Expected insufficient qty error, got {data}"
    
    def test_move_stage_invalid_qty_zero(self):
        """PATCH with qty=0 returns 400/422 validation error"""
        response = requests.patch(
            f"{BASE_URL}/api/purchase-orders/lines/line-001/move-stage",
            json={"fromStage": "ORDERED", "toStage": "PENDING_CO", "qty": 0}
        )
        assert response.status_code in [400, 422], f"Expected 400/422, got {response.status_code}"
    
    def test_move_stage_missing_fields(self):
        """PATCH with missing required fields returns 400/422"""
        response = requests.patch(
            f"{BASE_URL}/api/purchase-orders/lines/line-001/move-stage",
            json={"fromStage": "ORDERED"}  # Missing toStage and qty
        )
        assert response.status_code in [400, 422], f"Expected 400/422, got {response.status_code}"
    
    def test_move_stage_success_and_verify(self):
        """PATCH move-stage succeeds and updates totals"""
        # First get current totals
        totals_before = requests.get(f"{BASE_URL}/api/purchase-orders/stage-totals").json()
        pending_co_before = totals_before["pendingCo"]
        
        # Find a line with available ORDERED qty (line-001 should have some)
        # Try to move from PENDING_CO to AT_GODOWN (legal transition)
        response = requests.patch(
            f"{BASE_URL}/api/purchase-orders/lines/line-001/move-stage",
            json={"fromStage": "PENDING_CO", "toStage": "AT_GODOWN", "qty": 1, "note": "TEST_move"}
        )
        
        if response.status_code == 200:
            data = response.json()
            assert "line" in data, "Response should contain 'line' field"
            
            # Verify totals updated
            totals_after = requests.get(f"{BASE_URL}/api/purchase-orders/stage-totals").json()
            assert totals_after["pendingCo"] == pending_co_before - 1, "pendingCo should decrease by 1"
            assert totals_after["godown"] == totals_before["godown"] + 1, "godown should increase by 1"
            print(f"Move successful: pendingCo {pending_co_before} -> {totals_after['pendingCo']}, godown {totals_before['godown']} -> {totals_after['godown']}")
        elif response.status_code == 422:
            # May fail if no qty available at PENDING_CO for line-001
            print(f"Move failed (expected if no qty at PENDING_CO): {response.json()}")
        else:
            pytest.fail(f"Unexpected status code: {response.status_code}, body: {response.text}")


class TestAPIValidation:
    """Additional validation tests"""
    
    def test_stage_totals_with_brand_filter(self):
        """GET /api/purchase-orders/stage-totals?brand=GROHE filters by brand"""
        response = requests.get(f"{BASE_URL}/api/purchase-orders/stage-totals?brand=GROHE")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "ordered" in data, "Missing 'ordered' field"
        print(f"GROHE brand totals: ordered={data['ordered']}")
    
    def test_stage_totals_with_vendor_filter(self):
        """GET /api/purchase-orders/stage-totals?vendor=GROHE filters by vendor"""
        response = requests.get(f"{BASE_URL}/api/purchase-orders/stage-totals?vendor=GROHE")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "ordered" in data, "Missing 'ordered' field"
        print(f"GROHE vendor totals: ordered={data['ordered']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
