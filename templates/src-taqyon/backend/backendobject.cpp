#include "backendobject.h"
#include <QDebug>

BackendObject::BackendObject(QObject *parent)
    : QObject(parent), m_message("Hello from C++ backend!"), m_count(0) {}

QString BackendObject::message() const {
    return m_message;
}

void BackendObject::setMessage(const QString &msg) {
    if (m_message != msg) {
        m_message = msg;
        emit messageChanged(m_message);
    }
}

int BackendObject::count() const {
    return m_count;
}

void BackendObject::setCount(int count) {
    // Log the count value when called from frontend
    qInfo() << "Backend received setCount with value:" << count;

    if (m_count != count) {
        m_count = count;
        emit countChanged(m_count);
    }
}

void BackendObject::incrementCount() {
    qInfo() << "Backend incrementCount called, current count:" << m_count;
    setCount(m_count + 1);
}

void BackendObject::sendToBackend(const QString &text) {
    // Example: echo back to frontend
    emit sendToFrontend(QString("Backend received: %1").arg(text));
} 